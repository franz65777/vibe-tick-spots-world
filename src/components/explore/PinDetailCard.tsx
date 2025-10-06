import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Heart, Bookmark, MessageSquare, X, Share2, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { locationInteractionService } from '@/services/locationInteractionService';
import { supabase } from '@/integrations/supabase/client';
import VisitedModal from './VisitedModal';
import PinShareModal from './PinShareModal';

interface PinDetailCardProps {
  place: any;
  onClose: () => void;
}

const PinDetailCard = ({ place, onClose }: PinDetailCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [showVisitedModal, setShowVisitedModal] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [drawerState, setDrawerState] = useState<'minimized' | 'expanded'>('minimized');
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsPage, setPostsPage] = useState(1);
  const [hasMorePosts, setHasMorePosts] = useState(true);

  const fetchPosts = async (page: number = 1) => {
    setPostsLoading(true);
    try {
      // First, try to find location by google_place_id
      let locationId = place.id;
      
      if (!locationId && place.google_place_id) {
        const { data: locationData } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', place.google_place_id)
          .maybeSingle();
        
        locationId = locationData?.id;
      }
      
      if (locationId) {
        const limit = 10;
        const offset = (page - 1) * limit;
        
        const { data, error } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .eq('location_id', locationId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        if (data) {
          if (page === 1) {
            setPosts(data);
          } else {
            setPosts(prev => [...prev, ...data]);
          }
          setHasMorePosts(data.length === limit);
        }
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const loadMorePosts = () => {
    const nextPage = postsPage + 1;
    setPostsPage(nextPage);
    fetchPosts(nextPage);
  };

  useEffect(() => {
    const checkInteractions = async () => {
      if (place.id) {
        const [liked, saved] = await Promise.all([
          locationInteractionService.isLocationLiked(place.id),
          locationInteractionService.isLocationSaved(place.id)
        ]);
        
        setIsLiked(liked);
        setIsSaved(saved);
      }
    };

    checkInteractions();
    fetchPosts();
  }, [place.id]);

  const handleSaveToggle = async () => {
    setLoading(true);
    try {
      if (isSaved) {
        await locationInteractionService.unsaveLocation(place.id);
        setIsSaved(false);
      } else {
        await locationInteractionService.saveLocation(place.id, {
          google_place_id: place.google_place_id,
          name: place.name,
          address: place.address,
          latitude: place.coordinates?.lat || 0,
          longitude: place.coordinates?.lng || 0,
          category: place.category,
          types: place.types || []
        });
        setIsSaved(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDirections = () => {
    // Detect device and use appropriate maps app
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const coords = `${place.coordinates.lat},${place.coordinates.lng}`;
    
    const url = isIOS 
      ? `maps://maps.apple.com/?daddr=${coords}`
      : `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
    
    window.open(url, '_blank');
  };

  return (
    <>
      <Drawer 
        open={true} 
        onOpenChange={(open) => { if (!open) onClose(); }} 
        modal={false}
      >
        <DrawerContent className={`h-auto transition-all duration-300 ${drawerState === 'minimized' ? 'max-h-[220px]' : 'max-h-[85vh]'}`}>
          {/* Header with location info */}
          <div className="bg-background px-4 pt-3 pb-2">
            <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h3 className="font-bold text-xl text-foreground">{place.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{place.city || place.address?.split(',')[1]?.trim() || 'Unknown location'}</span>
                  <span>•</span>
                  <span className="text-xs">{posts.length} posts</span>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="ghost"
                size="icon"
                className="rounded-full -mt-1"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="bg-background px-4 py-3 border-y border-border">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSaveToggle}
                disabled={loading}
                size="sm"
                variant={isSaved ? "default" : "secondary"}
                className="flex-1"
              >
                <Bookmark className={`w-4 h-4 mr-1 ${isSaved ? 'fill-current' : ''}`} />
                {isSaved ? 'Saved' : 'Save'}
              </Button>

              <Button
                onClick={() => setShowVisitedModal(true)}
                size="sm"
                variant="secondary"
                className="flex-1"
              >
                <Heart className="w-4 h-4 mr-1" />
                Visited
              </Button>

              <Button
                onClick={handleDirections}
                size="sm"
                variant="secondary"
                className="flex-1"
              >
                <Navigation className="w-4 h-4 mr-1" />
                Directions
              </Button>

              <Button
                onClick={() => setShareOpen(true)}
                size="sm"
                variant="secondary"
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
            </div>
          </div>

          {/* Expand/Collapse Button */}
          {drawerState === 'minimized' && posts.length > 0 && (
            <button
              onClick={() => setDrawerState('expanded')}
              className="w-full py-3 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors border-t border-border"
            >
              <ChevronUp className="w-4 h-4" />
              <span>View {posts.length} posts</span>
            </button>
          )}

          {/* Community Posts - Vertical Grid (only shown when expanded) */}
          {drawerState === 'expanded' && (
            <div className="px-4 py-4 bg-muted/30 max-h-[calc(85vh-220px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <h4 className="font-semibold text-sm text-foreground">
                    Community posts ({posts.length})
                  </h4>
                </div>
                <button
                  onClick={() => setDrawerState('minimized')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Minimize
                </button>
              </div>
              
              {posts.length > 0 ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {posts.map((post) => (
                      <div 
                        key={post.id} 
                        className="relative rounded-xl overflow-hidden bg-card shadow-sm"
                      >
                        {/* Post Image */}
                        {post.media_urls?.[0] && (
                          <div className="relative w-full h-48">
                            <img 
                              src={post.media_urls[0]} 
                              alt="" 
                              className="w-full h-full object-cover"
                            />
                            {/* User Avatar Overlay */}
                            <div className="absolute top-2 left-2">
                              <Avatar className="w-8 h-8 border-2 border-white shadow-lg">
                                <AvatarImage src={post.profiles?.avatar_url} />
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                  {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                            {/* Multiple images indicator */}
                            {post.media_urls.length > 1 && (
                              <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full font-medium">
                                +{post.media_urls.length - 1}
                              </div>
                            )}
                          </div>
                        )}
                        {/* Post Caption */}
                        {post.caption && (
                          <div className="p-2.5">
                            <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
                              {post.caption}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Load More Button */}
                  {hasMorePosts && (
                    <div className="mt-4 flex justify-center">
                      <Button
                        onClick={loadMorePosts}
                        disabled={postsLoading}
                        variant="outline"
                        size="sm"
                      >
                        {postsLoading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="py-8 text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">No community posts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Be the first to share!</p>
                </div>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {showVisitedModal && (
        <VisitedModal
          place={place}
          onClose={() => setShowVisitedModal(false)}
        />
      )}

      <PinShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        place={place}
      />
    </>
  );
};

export default PinDetailCard;
