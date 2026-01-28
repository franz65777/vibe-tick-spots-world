import React, { useEffect, useState, memo, lazy, Suspense, useRef, useCallback, useMemo } from 'react';
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
import FolderDetailModal from '@/components/profile/FolderDetailModal';
import { useVisitedSaves } from '@/hooks/useVisitedSaves';
import UserVisitedCard from '@/components/feed/UserVisitedCard';
import { storeFeedScrollAnchor } from '@/utils/feedScroll';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';
import { useBatchEngagementStates } from '@/hooks/useBatchEngagementStates';
import FeedPostSkeleton from '@/components/feed/FeedPostSkeleton';

// Lazy load heavy components
const FeedPostItem = lazy(() => import('@/components/feed/FeedPostItem'));
const CityStatsCard = lazy(() => import('@/components/feed/CityStatsCard'));
const FeedListsCarousel = lazy(() => import('@/components/feed/FeedListsCarousel'));
const FeedSuggestionsCarousel = lazy(() => import('@/components/feed/FeedSuggestionsCarousel'));

const FeedPage = memo(() => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  // Prefetch altre tab per transizioni istantanee
  useTabPrefetch('feed');
  
  const [feedType, setFeedType] = useState<'forYou' | 'promotions'>('forYou');
  
  // Folder modal state - managed within FeedPage to keep feed mounted
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [folderFilterCity, setFolderFilterCity] = useState<string | null>(null);
  
  // Listen for folder open events from FeedListsCarousel
  useEffect(() => {
    const handleOpenFolder = (e: CustomEvent<{ folderId: string; filterCity?: string }>) => {
      setOpenFolderId(e.detail.folderId);
      setFolderFilterCity(e.detail.filterCity || null);
    };
    
    window.addEventListener('feed:open-folder', handleOpenFolder as any);
    return () => window.removeEventListener('feed:open-folder', handleOpenFolder as any);
  }, []);
  
  // Handle folder close
  const handleFolderClose = useCallback(() => {
    setOpenFolderId(null);
    setFolderFilterCity(null);
  }, []);
  
  // Handle location click from folder
  const handleFolderLocationClick = useCallback((locationData: any) => {
    setOpenFolderId(null);

    // Save scroll position before navigating (anchor restore)
    storeFeedScrollAnchor();
    
    navigate('/', { 
      state: { 
        selectedLocation: locationData,
        returnTo: '/feed'
      } 
    });
  }, [navigate]);
  
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
  
  // Fetch visited saves for interleaving in feed
  const { data: visitedSaves = [] } = useVisitedSaves();
  
  // Batch fetch engagement states for all posts AND visited cards to eliminate N+1 queries
  const postIds = useMemo(() => feedItems.map((p: any) => p.id), [feedItems]);
  const locationIds = useMemo(() => feedItems.map((p: any) => p.location_id), [feedItems]);
  const visitedLocationIds = useMemo(() => 
    visitedSaves.map(v => v.location_id).filter((id): id is string => !!id), 
    [visitedSaves]
  );
  const { data: batchEngagement } = useBatchEngagementStates(postIds, locationIds, visitedLocationIds);
  
  // Merge posts and visited saves chronologically
  type FeedEntry = 
    | { type: 'post'; data: any; created_at: string }
    | { type: 'visited'; data: typeof visitedSaves[0]; created_at: string };
  
  const mergedFeed = useMemo(() => {
    if (feedType !== 'forYou') return feedItems.map(item => ({ type: 'post' as const, data: item, created_at: item.created_at }));
    
    const postEntries: FeedEntry[] = feedItems.map(item => ({
      type: 'post',
      data: item,
      created_at: item.created_at,
    }));
    
    const visitedEntries: FeedEntry[] = visitedSaves.map(save => ({
      type: 'visited',
      data: save,
      created_at: save.created_at,
    }));
    
    // Merge and sort chronologically
    return [...postEntries, ...visitedEntries].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [feedItems, visitedSaves, feedType]);
  
  // Restore scroll position when returning to feed from location card
  const hasRestoredScroll = useRef(false);

  useEffect(() => {
    if (hasRestoredScroll.current) return;

    const raw = sessionStorage.getItem('feed_scroll_anchor');
    if (!raw || !scrollContainerRef.current || feedItems.length === 0) return;

    hasRestoredScroll.current = true;

    try {
      const data = JSON.parse(raw) as { postId?: string; offset?: number; scrollTop?: number };
      const container = scrollContainerRef.current;
      const fallbackScrollTop = typeof data.scrollTop === 'number' ? data.scrollTop : 0;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = data.postId ? document.getElementById(`feed-post-${data.postId}`) : null;
          if (el && typeof data.offset === 'number') {
            container.scrollTop = el.offsetTop - data.offset;
          } else {
            container.scrollTop = fallbackScrollTop;
          }
          sessionStorage.removeItem('feed_scroll_anchor');
        });
      });
    } catch {
      sessionStorage.removeItem('feed_scroll_anchor');
    }
  }, [feedItems.length]);

  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(new Set());
  const [storiesViewerOpen, setStoriesViewerOpen] = useState(false);
  const [selectedUserStoryIndex, setSelectedUserStoryIndex] = useState(0);
  const [filteredStories, setFilteredStories] = useState<typeof stories>([]);
  const [postLikes, setPostLikes] = useState<Map<string, PostLikeUser[]>>(new Map());
  // Comment drawer state
  const [commentDrawerOpen, setCommentDrawerOpen] = useState(false);
  const [commentPostId, setCommentPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  
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

  // Stable post ID set for realtime subscription - only recreate channel when post IDs actually change
  const postIdsRef = useRef<string>('');
  const feedPostIds = useMemo(() => {
    const ids = feedItems.map((p: any) => p.id).sort().join(',');
    return ids;
  }, [feedItems]);

  // Keep post counts live using centralized realtime - NO individual channel!
  const postIdSetRef = useRef<Set<string>>(new Set());
  
  // Update the post ID set when feed changes
  useEffect(() => {
    postIdSetRef.current = new Set(feedItems.map((p: any) => p.id));
  }, [feedItems]);

  const queryKey = useMemo(() => 
    feedType === 'promotions' ? ['promotions-feed', user?.id] : ['feed', user?.id],
    [feedType, user?.id]
  );

  // Use centralized realtime for comment count updates
  useRealtimeEvent(['post_comment_insert', 'post_comment_delete'], useCallback((payload: any) => {
    const postId = payload.post_id;
    if (!postId || !postIdSetRef.current.has(postId)) return;
    
    const delta = payload.id && !payload._deleted ? 1 : -1;
    queryClient.setQueryData<any[]>(queryKey, (prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((p: any) =>
        p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) + delta) } : p
      );
    });
  }, [queryClient, queryKey]));

  // Use centralized realtime for share count updates
  useRealtimeEvent(['post_share_insert', 'post_share_delete'], useCallback((payload: any) => {
    const postId = payload.post_id;
    if (!postId || !postIdSetRef.current.has(postId)) return;
    
    const delta = payload.id && !payload._deleted ? 1 : -1;
    queryClient.setQueryData<any[]>(queryKey, (prev) => {
      if (!Array.isArray(prev)) return prev;
      return prev.map((p: any) =>
        p.id === postId ? { ...p, shares_count: Math.max(0, (p.shares_count || 0) + delta) } : p
      );
    });
  }, [queryClient, queryKey]));

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
      // Save scroll position before navigating to profile
      storeFeedScrollAnchor();
      
      // Navigate to public business view page if it's a business account
      if (isBusiness) {
        navigate(`/business/view/${userId}`);
      } else {
        navigate(`/profile/${userId}`);
      }
    }
  };

  const handleLocationClick = (postId: string, locationId: string, latitude: number, longitude: number, locationName: string | null, e: React.MouseEvent) => {
    e.stopPropagation();

    // Save an anchor (post + its current visual offset) so we can restore *exactly* the same point
    const container = scrollContainerRef.current;
    const postEl = document.getElementById(`feed-post-${postId}`);
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const postRect = postEl?.getBoundingClientRect();
      const offset = postRect ? postRect.top - containerRect.top : 0;

      sessionStorage.setItem(
        'feed_scroll_anchor',
        JSON.stringify({ postId, offset, scrollTop: container.scrollTop })
      );
    }

    // Get full location data from the post
    const post = feedItems.find(i => i.id === postId) as any;
    const location = post?.locations;

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
          name: locationName || location?.name || '',
          lat: latitude,
          lng: longitude,
          category: location?.category || 'restaurant',
          sourcePostId: postId
        },
        returnTo: '/feed'
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
    setCommentsLoading(true);
    setCommentDrawerOpen(true);
    const postComments = await getPostComments(postId);
    setComments(postComments);
    setCommentsLoading(false);
  };

  const handleAddComment = async (content: string) => {
    if (!user?.id || !commentPostId) return;

    const newComment = await addPostComment(commentPostId, user.id, content);
    if (newComment) {
      setComments(prev => [...prev, newComment]);

      const queryKey = feedType === 'promotions' ? ['promotions-feed', user.id] : ['feed', user.id];
      queryClient.setQueryData<any[]>(queryKey, (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((p: any) =>
          p.id === commentPostId
            ? { ...p, comments_count: (p.comments_count || 0) + 1 }
            : p
        );
      });
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user?.id) return;

    const success = await deletePostComment(commentId, user.id);
    if (success) {
      setComments(prev => prev.filter(c => c.id !== commentId));

      // Best-effort: when we delete, decrement the visible post count too
      if (commentPostId) {
        const queryKey = feedType === 'promotions' ? ['promotions-feed', user.id] : ['feed', user.id];
        queryClient.setQueryData<any[]>(queryKey, (prev) => {
          if (!Array.isArray(prev)) return prev;
          return prev.map((p: any) =>
            p.id === commentPostId
              ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }
              : p
          );
        });
      }
    }
  };

  const handleShareClick = (postId: string) => {
    setSharePostId(postId);
    setShareModalOpen(true);
  };

  const handleShare = async (recipientIds: string[]) => {
    if (!sharePostId || !user?.id) return false;

    const postItem = feedItems.find(item => item.id === sharePostId) as any;
    if (!postItem) return false;

    try {
      // Include user info for display in DMs
      const profile = postItem.profiles;
      const postData = {
        id: sharePostId,
        caption: postItem.caption,
        media_urls: postItem.media_urls || [],
        user_id: postItem.user_id,
        username: profile?.username || 'Unknown',
        avatar_url: profile?.avatar_url || null
      };

      await Promise.all(
        recipientIds.map(recipientId =>
          messageService.sendPostShare(recipientId, postData)
        )
      );

      // Record share count (for live counters)
      await supabase.from('post_shares').insert({ user_id: user.id, post_id: sharePostId });

      // Optimistically bump local feed count
      const queryKey = feedType === 'promotions' ? ['promotions-feed', user.id] : ['feed', user.id];
      queryClient.setQueryData<any[]>(queryKey, (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((p: any) =>
          p.id === sharePostId
            ? { ...p, shares_count: (p.shares_count || 0) + 1 }
            : p
        );
      });

      // Broadcast so other UI (cards/modals) updates immediately too
      window.dispatchEvent(new CustomEvent('post-engagement-updated', {
        detail: { postId: sharePostId, sharesDelta: 1 }
      }));

      toast({
        title: t('postShared', { ns: 'common', defaultValue: 'Post condiviso' }),
      });

      return true;
    } catch (error) {
      console.error('Error sharing post:', error);
      toast({
        title: t('error', { ns: 'common', defaultValue: 'Errore' }),
        description: t('add.errorCreating', { defaultValue: 'Impossibile condividere il post. Riprova.' }),
        variant: 'destructive',
      });
      return false;
    }
  };


  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden pt-[env(safe-area-inset-top)]">
      <div className="w-full h-full flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background shrink-0 w-full">
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
              <DropdownMenuContent align="start" className="w-56 border-[1.5px] border-transparent shadow-sm
                [background-image:linear-gradient(hsl(var(--popover)),hsl(var(--popover))),linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))]
                [background-origin:border-box] [background-clip:padding-box,border-box]">
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
        <div ref={scrollContainerRef} data-feed-scroll-container className="flex-1 overflow-y-scroll pb-24 scrollbar-hide bg-background">
          {loading ? (
            <div className="space-y-0 bg-background">
              <FeedPostSkeleton />
              <FeedPostSkeleton />
              <FeedPostSkeleton />
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
              {/* City Stats Card - always at top for "For You" feed */}
              {feedType === 'forYou' && (
                <Suspense fallback={<div className="mx-4 mb-4 h-48 bg-muted rounded-2xl animate-pulse" />}>
                  <CityStatsCard />
                </Suspense>
              )}

              {/* Feed items with structured layout:
                  1. City Stats (above)
                  2. 1 post OR 2 visited cards
                  3. Lists carousel
                  4. 1 post OR 2 visited cards  
                  5. Suggestions carousel
                  6. Rest of content
              */}
              {(() => {
                // Separate posts and visited entries
                const posts = mergedFeed.filter(e => e.type === 'post');
                const visitedCards = mergedFeed.filter(e => e.type === 'visited');
                
                const elements: React.ReactNode[] = [];
                let postIdx = 0;
                let visitedIdx = 0;
                
                // Helper to render a post
                const renderPost = (entry: typeof mergedFeed[0], key: string) => {
                  const item = entry.data;
                  const profile = item.profiles as any;
                  const userId = item.user_id;
                  const userHasStory = stories.some(s => s.user_id === userId);
                  
                  // Get pre-loaded engagement states from batch fetch
                  const isLiked = batchEngagement?.likedPostIds.has(item.id);
                  const saveTag = item.location_id ? (batchEngagement?.savedLocations.get(item.location_id) ?? null) : null;
                  
                  return (
                    <Suspense key={key} fallback={<FeedPostSkeleton />}>
                      <FeedPostItem
                        item={item}
                        profile={profile}
                        userHasStory={userHasStory}
                        postLikes={postLikes}
                        expandedCaptions={expandedCaptions}
                        isPromotionFeed={feedType === 'promotions'}
                        initialIsLiked={isLiked}
                        initialSaveTag={saveTag}
                        onAvatarClick={handleAvatarClick}
                        onLocationClick={handleLocationClick}
                        onCommentClick={handleCommentClick}
                        onShareClick={handleShareClick}
                        onToggleCaption={toggleCaption}
                      />
                    </Suspense>
                  );
                };
                
                // Helper to render visited card with batch engagement data
                const renderVisited = (entry: typeof mergedFeed[0], key: string) => {
                  const locationId = entry.data.location_id;
                  // Only pass batch data if it's loaded - otherwise let the card fetch its own data
                  const hasBatchData = !!batchEngagement;
                  const isSaved = hasBatchData && locationId ? batchEngagement.savedLocations.has(locationId) : undefined;
                  const saveTag = hasBatchData && locationId ? (batchEngagement.savedLocations.get(locationId) ?? null) : undefined;
                  const isLiked = hasBatchData && locationId ? batchEngagement.likedLocationIds.has(locationId) : undefined;
                  const likeCount = hasBatchData && locationId ? (batchEngagement.locationLikeCounts.get(locationId) ?? 0) : undefined;
                  
                  return (
                    <div key={key} className="py-1">
                      <UserVisitedCard 
                        activity={entry.data}
                        initialIsSaved={isSaved}
                        initialSaveTag={saveTag}
                        initialIsLiked={isLiked}
                        initialLikeCount={likeCount}
                      />
                    </div>
                  );
                };
                
                // Section 1: 1 post OR 2 visited cards
                if (posts.length > 0) {
                  elements.push(renderPost(posts[postIdx], `section1-post-${posts[postIdx].data.id}`));
                  postIdx++;
                } else {
                  // Show up to 2 visited cards
                  for (let i = 0; i < 2 && visitedIdx < visitedCards.length; i++) {
                    elements.push(renderVisited(visitedCards[visitedIdx], `section1-visited-${visitedCards[visitedIdx].data.id}`));
                    visitedIdx++;
                  }
                }
                
                // Lists carousel
                if (feedType === 'forYou') {
                  elements.push(
                    <Suspense key="lists-carousel" fallback={null}>
                      <FeedListsCarousel />
                    </Suspense>
                  );
                }
                
                // Section 2: 1 post OR 2 visited cards
                if (postIdx < posts.length) {
                  elements.push(renderPost(posts[postIdx], `section2-post-${posts[postIdx].data.id}`));
                  postIdx++;
                } else {
                  // Show up to 2 visited cards
                  for (let i = 0; i < 2 && visitedIdx < visitedCards.length; i++) {
                    elements.push(renderVisited(visitedCards[visitedIdx], `section2-visited-${visitedCards[visitedIdx].data.id}`));
                    visitedIdx++;
                  }
                }
                
                // Suggestions carousel
                if (feedType === 'forYou') {
                  elements.push(
                    <Suspense key="suggestions-carousel" fallback={null}>
                      <FeedSuggestionsCarousel />
                    </Suspense>
                  );
                }
                
                // Rest of content: remaining posts and visited cards merged chronologically
                const remainingPosts = posts.slice(postIdx);
                const remainingVisited = visitedCards.slice(visitedIdx);
                const remaining = [...remainingPosts, ...remainingVisited].sort(
                  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                );
                
                remaining.forEach((entry, idx) => {
                  if (entry.type === 'post') {
                    elements.push(renderPost(entry, `rest-post-${entry.data.id}-${idx}`));
                  } else {
                    elements.push(renderVisited(entry, `rest-visited-${entry.data.id}-${idx}`));
                  }
                });
                
                return elements;
              })()}
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
            setCommentsLoading(false);
          }}
          comments={comments}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
          isLoading={commentsLoading}
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

        {/* Folder Modal - rendered as overlay to keep feed mounted and preserve scroll */}
        {openFolderId && (
          <div className="fixed inset-0 z-[9999]">
            <FolderDetailModal
              folderId={openFolderId}
              isOpen={true}
              onClose={handleFolderClose}
              onLocationClick={handleFolderLocationClick}
              filterCity={folderFilterCity}
            />
          </div>
        )}
      </div>
    </div>
  );
});

FeedPage.displayName = 'FeedPage';

export default FeedPage;
