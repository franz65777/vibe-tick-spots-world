
import React, { useState, useEffect } from 'react';
import { MapPin, Heart, Bookmark, Users, MessageSquare, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { locationInteractionService } from '@/services/locationInteractionService';
import PinShareModal from './PinShareModal';

interface EnhancedLocationCardProps {
  place: any;
  onCardClick: (place: any) => void;
}

const EnhancedLocationCard = ({ place, onCardClick }: EnhancedLocationCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  useEffect(() => {
    const checkInteractions = async () => {
      if (place.id) {
        const [liked, saved, count] = await Promise.all([
          locationInteractionService.isLocationLiked(place.id),
          locationInteractionService.isLocationSaved(place.id),
          locationInteractionService.getLocationLikeCount(place.id)
        ]);
        
        setIsLiked(liked);
        setIsSaved(saved);
        setLikeCount(count);
      }
    };

    checkInteractions();
  }, [place.id]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    
    try {
      const result = await locationInteractionService.toggleLocationLike(place.id);
      setIsLiked(result.liked);
      setLikeCount(result.count);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
    } catch (error) {
      console.error('Error toggling save:', error);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = () => {
    // Smart image loading based on category
    const categoryImages: Record<string, string> = {
      'restaurant': 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      'cafe': 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
      'bar': 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=300&fit=crop',
      'hotel': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
      'attraction': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
      'shopping': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=300&fit=crop',
      'park': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=300&fit=crop'
    };

    // Return existing image or category-based fallback
    return place.image || categoryImages[place.category] || categoryImages['attraction'];
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 group mx-4 mb-3"
      onClick={() => onCardClick(place)}
    >
      {/* Mobile Optimized Image section */}
      <div className="relative h-36 overflow-hidden">
        <img 
          src={getImageUrl()} 
          alt={place.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        
        {/* Post count badge */}
        {place.postCount && place.postCount > 0 && (
          <div className="absolute top-2 right-2">
            <div className="bg-black/60 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {place.postCount}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Optimized Content section */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{place.name}</h3>
            <div className="flex items-center gap-1 text-gray-500">
              <MapPin className="w-3 h-3" />
              <span className="text-xs">{place.city || place.address?.split(',')[1]?.trim() || 'Unknown location'}</span>
            </div>
          </div>
        </div>

        {/* Mobile Optimized Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
          <div className="flex items-center gap-1">
            <Heart className="w-3 h-3 text-red-400" />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3 text-blue-400" />
            <span>{place.visitors?.length || 0}</span>
          </div>
          {place.distance && (
            <div className="flex items-center gap-1">
              <span className="text-green-500">•</span>
              <span>{typeof place.distance === 'number' ? `${place.distance.toFixed(1)}km` : place.distance}</span>
            </div>
          )}
        </div>

        {/* New Action Buttons Style */}
        <div className="grid grid-cols-4 gap-1.5">
          <Button
            onClick={handleSaveToggle}
            disabled={loading}
            variant="ghost"
            size="sm"
            className={`h-auto py-2.5 rounded-2xl flex flex-col items-center gap-1 transition-all ${
              isSaved 
                ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' 
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            <span className="text-[10px] font-medium">Saved</span>
          </Button>

          <Button
            onClick={() => window.location.href = '/add'}
            variant="ghost"
            size="sm"
            className="h-auto py-2.5 rounded-2xl flex flex-col items-center gap-1 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
          >
            <Heart className="w-4 h-4" />
            <span className="text-[10px] font-medium">Visited</span>
          </Button>

          <Button
            onClick={handleLikeToggle}
            disabled={loading}
            variant="ghost"
            size="sm"
            className="h-auto py-2.5 rounded-2xl flex flex-col items-center gap-1 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
          >
            <MapPin className="w-4 h-4" />
            <span className="text-[10px] font-medium">Directions</span>
          </Button>

          <Button
            onClick={(e) => {
              e.stopPropagation();
              setIsShareModalOpen(true);
            }}
            variant="ghost"
            size="sm"
            className="h-auto py-2.5 rounded-2xl flex flex-col items-center gap-1 bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all"
          >
            <Share2 className="w-4 h-4" />
            <span className="text-[10px] font-medium">Share</span>
          </Button>
        </div>
      </div>
      
      {/* Share Modal */}
      <PinShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        place={place}
      />
    </div>
  );
};

export default EnhancedLocationCard;
