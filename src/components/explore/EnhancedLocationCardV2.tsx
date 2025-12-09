import React, { useState, useEffect } from 'react';
import { MapPin, Bookmark, Phone, Globe, Navigation, Camera, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { locationInteractionService } from '@/services/locationInteractionService';
import PlaceActionButtons from './PlaceActionButtons';
import { useNormalizedCity } from '@/hooks/useNormalizedCity';
import { useLocationStats } from '@/hooks/useLocationStats';
import { useMarketingCampaign } from '@/hooks/useMarketingCampaign';
import MarketingCampaignBanner from './MarketingCampaignBanner';
import { getCategoryIcon } from '@/utils/categoryIcons';
import { getRatingColor, getRatingFillColor } from '@/utils/ratingColors';
import { cn } from '@/lib/utils';
import { SaveLocationDropdown } from '@/components/common/SaveLocationDropdown';
import type { SaveTag } from '@/utils/saveTags';

interface EnhancedLocationCardV2Props {
  place: any;
  onCardClick: (place: any) => void;
}

const EnhancedLocationCardV2 = ({ place, onCardClick }: EnhancedLocationCardV2Props) => {
  const [isSaved, setIsSaved] = useState(false);
  const [currentSaveTag, setCurrentSaveTag] = useState<SaveTag>('been');
  const [loading, setLoading] = useState(false);

  const { cityLabel } = useNormalizedCity({
    id: place.google_place_id || place.id,
    city: place.city,
    name: place.name,
    coordinates: place.coordinates,
    address: place.address
  });

  const { stats } = useLocationStats(place.id, place.google_place_id);
  const { campaign } = useMarketingCampaign(place.id, place.google_place_id);
  
  // Check if location has active campaign for sparkle effect
  const hasCampaign = Boolean(campaign);

  useEffect(() => {
    const checkSaved = async () => {
      if (!place.id) return;

      try {
        const saved = await locationInteractionService.isLocationSaved(place.id);
        setIsSaved(saved);

        if (saved) {
          const tag = await locationInteractionService.getCurrentSaveTag(
            place.google_place_id || place.id
          );
          setCurrentSaveTag((tag as SaveTag) || 'been');
        } else {
          setCurrentSaveTag('been');
        }
      } catch (error) {
        console.error('Error checking saved state:', error);
      }
    };
    checkSaved();
  }, [place.id, place.google_place_id]);

  // Listen for global save changes
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, isSaved: newSavedState, saveTag } = event.detail;
      if (locationId === place.id || locationId === place.google_place_id) {
        setIsSaved(newSavedState);
        if (saveTag) {
          setCurrentSaveTag(saveTag as SaveTag);
        } else if (!newSavedState) {
          setCurrentSaveTag('been');
        }
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, [place.id, place.google_place_id]);

  const handleSaveToggle = async (tag: SaveTag) => {
    setLoading(true);
    
    try {
      await locationInteractionService.saveLocation(place.id, {
        google_place_id: place.google_place_id,
        name: place.name,
        address: place.address,
        latitude: place.coordinates?.lat || 0,
        longitude: place.coordinates?.lng || 0,
        category: place.category,
        types: place.types || []
      }, tag);
      setIsSaved(true);
      setCurrentSaveTag(tag);
      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId: place.id, isSaved: true, saveTag: tag } 
      }));
      if (place.google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: place.google_place_id, isSaved: true, saveTag: tag }
        }));
      }
    } catch (error) {
      console.error('Error saving location:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsave = async () => {
    setLoading(true);
    
    try {
      await locationInteractionService.unsaveLocation(place.id);
      setIsSaved(false);
      setCurrentSaveTag('been');
      // Emit global event
      window.dispatchEvent(new CustomEvent('location-save-changed', { 
        detail: { locationId: place.id, isSaved: false } 
      }));
      if (place.google_place_id) {
        window.dispatchEvent(new CustomEvent('location-save-changed', {
          detail: { locationId: place.google_place_id, isSaved: false }
        }));
      }
    } catch (error) {
      console.error('Error unsaving location:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
  };

  const getCategoryTags = () => {
    // Generate descriptive tags based on category
    const tagMap: Record<string, string[]> = {
      'restaurant': ['Dining', 'Food & Drink', 'Reservations'],
      'cafe': ['Coffee', 'Casual Dining', 'WiFi'],
      'bar': ['Cocktails', 'Nightlife', 'Social'],
      'hotel': ['Accommodation', 'Stay', 'Hospitality'],
      'attraction': ['Tourist Spot', 'Must See', 'Popular'],
      'park': ['Outdoor', 'Nature', 'Recreation'],
    };

    return tagMap[place.category] || ['Place of Interest'];
  };

  return (
    <Card className="overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 relative bg-background/80 backdrop-blur-xl border-border/20">
      {/* Fireworks effect for campaigns */}
      {hasCampaign && (
        <div className="absolute -top-1 -left-1 z-20 pointer-events-none">
          <div className="relative w-12 h-12">
            <div className="absolute top-0 left-4 w-2 h-2 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 animate-[sparkle-float_1.8s_ease-in-out_infinite] shadow-lg"></div>
            <div className="absolute top-2 right-1 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-red-400 to-orange-400 animate-[sparkle-float_1.8s_ease-in-out_0.3s_infinite] shadow-lg"></div>
            <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-teal-400 to-green-500 animate-[sparkle-float_1.8s_ease-in-out_0.6s_infinite] shadow-lg"></div>
            <div className="absolute top-4 left-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-green-300 to-yellow-300 animate-[sparkle-float_1.8s_ease-in-out_0.9s_infinite] shadow-lg"></div>
            <div className="absolute top-5 right-0 w-1.5 h-1.5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 animate-[sparkle-float_1.8s_ease-in-out_1.2s_infinite] shadow-lg"></div>
            <div className="absolute top-3 left-6 w-1 h-1 rounded-full bg-gradient-to-br from-pink-400 to-red-500 animate-[sparkle-float_1.8s_ease-in-out_1.5s_infinite] shadow-lg"></div>
          </div>
        </div>
      )}
      
      {/* Map Preview with Overlay */}
      <div className="relative h-48 overflow-hidden">
        {/* Static Map Image - Replace with actual Google Maps Static API */}
        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600">
          <img
            src={`https://images.unsplash.com/photo-1524661135-423995f22d0b?w=600&h=300&fit=crop`}
            alt={`Map of ${place.name}`}
            className="w-full h-full object-cover opacity-90"
            onError={(e) => {
              // Fallback to gradient on error
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>

        {/* Place Name Overlay (Bottom Left) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 pb-3">
          <h3 className="text-white font-bold text-xl leading-tight drop-shadow-lg">
            {place.name}
          </h3>
        </div>

        {/* Rating (Top Left) */}
        {stats.averageRating && (
          <div className={cn("absolute top-3 left-3 flex items-center gap-1.5 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-lg", getRatingFillColor(stats.averageRating) + "/20")}>
            {(() => {
              const CategoryIcon = place.category ? getCategoryIcon(place.category) : Star;
              return <CategoryIcon className={cn("w-4 h-4", getRatingFillColor(stats.averageRating), getRatingColor(stats.averageRating))} />;
            })()}
            <span className={cn("text-sm font-bold", getRatingColor(stats.averageRating))}>{stats.averageRating.toFixed(1)}</span>
          </div>
        )}

        {/* Save Icon (Top Right) */}
        <div className="absolute top-3 right-3">
          <SaveLocationDropdown
            isSaved={isSaved}
            onSave={handleSaveToggle}
            onUnsave={handleUnsave}
            disabled={loading}
            variant="ghost"
            size="icon"
            currentSaveTag={currentSaveTag}
          />
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-3">
        {/* Tags and Category */}
        <div className="flex flex-wrap gap-2">
          {getCategoryTags().map((tag, index) => (
            <Badge key={index} variant="secondary" className="text-xs font-medium">
              {tag}
            </Badge>
          ))}
        </div>

        {/* Marketing Campaign Banner */}
        {campaign && (
          <div className="-mx-4 mb-3">
            <MarketingCampaignBanner campaign={campaign} />
          </div>
        )}

        {/* City Name */}
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span className="line-clamp-1">{cityLabel || 'Unknown City'}</span>
        </div>

        {/* Action Buttons */}
        <PlaceActionButtons place={place} />

        {/* Content Library Preview */}
        {place.postCount > 0 && (
          <div className="pt-3">
            <button
              onClick={() => onCardClick(place)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">
                  {place.postCount} photo{place.postCount !== 1 ? 's' : ''}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">See all →</span>
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default EnhancedLocationCardV2;
