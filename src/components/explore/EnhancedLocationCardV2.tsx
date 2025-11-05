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

interface EnhancedLocationCardV2Props {
  place: any;
  onCardClick: (place: any) => void;
}

const EnhancedLocationCardV2 = ({ place, onCardClick }: EnhancedLocationCardV2Props) => {
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const { cityLabel } = useNormalizedCity({
    id: place.google_place_id || place.id,
    city: place.city,
    name: place.name,
    coordinates: place.coordinates,
    address: place.address
  });

  const { stats } = useLocationStats(place.id, place.google_place_id);
  const { campaign } = useMarketingCampaign(place.id);

  useEffect(() => {
    const checkSaved = async () => {
      if (place.id) {
        const saved = await locationInteractionService.isLocationSaved(place.id);
        setIsSaved(saved);
      }
    };
    checkSaved();
  }, [place.id]);

  // Listen for global save changes
  useEffect(() => {
    const handleSaveChanged = (event: CustomEvent) => {
      const { locationId, isSaved: newSavedState } = event.detail;
      if (locationId === place.id) {
        setIsSaved(newSavedState);
      }
    };
    
    window.addEventListener('location-save-changed', handleSaveChanged as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChanged as EventListener);
    };
  }, [place.id]);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    
    try {
      if (isSaved) {
        await locationInteractionService.unsaveLocation(place.id);
        setIsSaved(false);
        // Emit global event
        window.dispatchEvent(new CustomEvent('location-save-changed', { 
          detail: { locationId: place.id, isSaved: false } 
        }));
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
        // Emit global event
        window.dispatchEvent(new CustomEvent('location-save-changed', { 
          detail: { locationId: place.id, isSaved: true } 
        }));
      }
    } catch (error) {
      console.error('Error toggling save:', error);
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
    <Card className="overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
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
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-yellow-500/95 backdrop-blur-sm text-white px-2.5 py-1.5 rounded-full shadow-lg">
            <Star className="w-4 h-4 fill-white" />
            <span className="text-sm font-bold">{stats.averageRating.toFixed(1)}</span>
          </div>
        )}

        {/* Save Icon (Top Right) */}
        <button
          onClick={handleSaveToggle}
          disabled={loading}
          className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm ${
            isSaved
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white/90 text-gray-700 hover:bg-white'
          }`}
        >
          <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
        </button>
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
