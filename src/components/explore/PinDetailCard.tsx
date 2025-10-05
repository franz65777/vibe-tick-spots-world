import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, Heart, Bookmark, MessageSquare, X, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { locationInteractionService } from '@/services/locationInteractionService';
import { CategoryIcon } from '@/components/common/CategoryIcon';
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

  const fetchPosts = async () => {
    if (place.id) {
      const { data } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('location_id', place.id)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (data) setPosts(data);
    }
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
    <Drawer open={true} onOpenChange={(open) => { if (!open) onClose(); }} modal={false}>
      <DrawerContent className="max-h-[90vh] rounded-t-3xl">
        {/* Header */}
        <div className="relative p-6 border-b border-gray-100">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="flex items-start gap-3">
            <CategoryIcon category={place.category} className="w-10 h-10" />
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900">{place.name}</h3>
              <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                <MapPin className="w-4 h-4" />
                <span>{place.city || place.address?.split(',')[1]?.trim() || 'Unknown location'}</span>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="max-h-[70vh]">
          {/* Action Buttons */}
          <div className="p-4 grid grid-cols-4 gap-2">
          <Button
            onClick={handleSaveToggle}
            disabled={loading}
            variant="outline"
            className={`flex flex-col items-center gap-1 h-auto py-3 ${
              isSaved ? 'bg-blue-50 border-blue-300 text-blue-600' : ''
            }`}
          >
            <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            <span className="text-xs">{isSaved ? 'Saved' : 'Save'}</span>
          </Button>

          <Button
            onClick={() => setShowVisitedModal(true)}
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Heart className="w-5 h-5" />
            <span className="text-xs">Visited</span>
          </Button>

          <Button
            onClick={handleDirections}
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Navigation className="w-5 h-5" />
            <span className="text-xs">Directions</span>
          </Button>

          <Button
            onClick={() => setShareOpen(true)}
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-3"
          >
            <Share2 className="w-5 h-5" />
            <span className="text-xs">Share</span>
          </Button>
          </div>

          {/* Community Posts */}
          {posts.length > 0 && (
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <h4 className="font-semibold text-sm text-gray-900">Community posts</h4>
              </div>
              <div className="space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={post.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {post.profiles?.username?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium text-gray-900">
                        {post.profiles?.username}
                      </span>
                    </div>
                    {post.caption && (
                      <p className="text-sm text-gray-700">{post.caption}</p>
                    )}
                    {post.media_urls?.[0] && (
                      <img 
                        src={post.media_urls[0]} 
                        alt="" 
                        className="w-full h-32 object-cover rounded-lg mt-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {posts.length === 0 && (
            <div className="px-4 pb-4 text-center text-gray-500 text-sm">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p>No community posts</p>
            </div>
          )}
        </ScrollArea>

        <PinShareModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          place={place}
        />
      </DrawerContent>
    </Drawer>
  );
};

export default PinDetailCard;
