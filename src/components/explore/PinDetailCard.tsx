import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Heart, Bookmark, MessageSquare, ChevronLeft, Share2, ChevronUp } from 'lucide-react';
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
const PinDetailCard = ({
  place,
  onClose
}: PinDetailCardProps) => {
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
        const {
          data: locationData
        } = await supabase.from('locations').select('id').eq('google_place_id', place.google_place_id).maybeSingle();
        locationId = locationData?.id;
      }
      if (locationId) {
        const limit = 10;
        const offset = (page - 1) * limit;
        const {
          data: postRows,
          error
        } = await supabase.from('posts').select('id, user_id, caption, media_urls, created_at, location_id').eq('location_id', locationId).order('created_at', {
          ascending: false
        }).range(offset, offset + limit - 1);
        if (postRows) {
          const userIds = Array.from(new Set(postRows.map(p => p.user_id).filter(Boolean)));
          let profilesMap = new Map<string, {
            username: string | null;
            avatar_url: string | null;
          }>();
          if (userIds.length) {
            const {
              data: profilesData
            } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds);
            profilesMap = new Map((profilesData || []).map((p: any) => [p.id, {
              username: p.username,
              avatar_url: p.avatar_url
            }]));
          }
          const mapped = postRows.map((p: any) => ({
            ...p,
            profiles: profilesMap.get(p.user_id) || null
          }));
          if (page === 1) {
            setPosts(mapped);
          } else {
            setPosts(prev => [...prev, ...mapped]);
          }
          setHasMorePosts(postRows.length === limit);
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
        const [liked, saved] = await Promise.all([locationInteractionService.isLocationLiked(place.id), locationInteractionService.isLocationSaved(place.id)]);
        setIsLiked(liked);
        setIsSaved(saved);
      }
    };
    checkInteractions();
    // Only fetch posts when drawer is expanded
    if (drawerState === 'expanded' && posts.length === 0) {
      fetchPosts();
    }
  }, [place.id, drawerState]);
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
    const url = isIOS ? `maps://maps.apple.com/?daddr=${coords}` : `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
    window.open(url, '_blank');
  };
  return <>
      <Drawer open={true} modal={false} onOpenChange={open => {
      if (!open) onClose();
    }}>
        
      </Drawer>

      {showVisitedModal && <VisitedModal place={place} onClose={() => setShowVisitedModal(false)} />}

      <PinShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} place={place} />
    </>;
};
export default PinDetailCard;