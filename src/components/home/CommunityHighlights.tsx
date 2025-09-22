import React from 'react';
import { MapPin, Heart, Users, Star, Crown, Sparkles, TrendingUp } from 'lucide-react';
import { useNearbyLocations } from '@/hooks/useNearbyLocations';

interface CommunityHighlightsProps {
  currentCity: string;
  userLocation: { lat: number; lng: number } | null;
  onLocationClick: (locationId: string, coordinates?: { lat: number; lng: number }) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coordinates: { lat: number; lng: number }) => void;
}

// Mock data for nearby featured locations - in real app this would come from API
const getMockFeaturedLocations = (city: string) => [
  {
    id: '1',
    name: 'Artisan Coffee Co.',
    type: 'business_offer',
    description: '20% off this week',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=80&h=80&fit=crop&crop=center',
    stats: { saves: 12, followers: 8 },
    badge: '20% OFF'
  },
  {
    id: '2', 
    name: 'Central Park',
    type: 'popular',
    description: 'Saved by 15 people you follow',
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=80&h=80&fit=crop&crop=center',
    stats: { saves: 15, followers: 15 },
    badge: 'Popular'
  },
  {
    id: '3',
    name: 'Luna Rooftop',
    type: 'weekly_winner',
    description: 'This week\'s most loved spot',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=80&h=80&fit=crop&crop=center',
    stats: { saves: 24, followers: 10 },
    badge: 'Featured'
  }
];

const CommunityHighlights = ({ 
  currentCity, 
  userLocation,
  onLocationClick, 
  onUserClick, 
  onMapLocationClick 
}: CommunityHighlightsProps) => {
  const { locations, loading } = useNearbyLocations({
    userLat: userLocation?.lat,
    userLng: userLocation?.lng,
    limit: 8,
    autoFetch: true
  });

  return (
    <div className="px-4 py-2">
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {locations.map((location) => (
          <div 
            key={location.id}
            onClick={() => onLocationClick(location.id, location.coordinates)}
            className="flex-shrink-0 w-32 bg-gradient-to-br from-card/95 to-card/80 rounded-xl border border-border/30 p-2 cursor-pointer hover:shadow-md hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center">
              <div className="relative mb-2">
                <img 
                  src={location.image} 
                  alt={location.name}
                  className="w-12 h-12 rounded-lg object-cover shadow-sm"
                />
                <div className="absolute -top-1 -right-1">
                  {location.type === 'business_offer' && (
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-full p-1 shadow-sm">
                      <Sparkles className="w-2 h-2 text-white" />
                    </div>
                  )}
                  {location.type === 'popular' && (
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-1 shadow-sm">
                      <TrendingUp className="w-2 h-2 text-white" />
                    </div>
                  )}
                  {location.type === 'weekly_winner' && (
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1 shadow-sm">
                      <Crown className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="text-center">
                <h4 className="font-semibold text-xs text-foreground truncate mb-1">{location.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  location.type === 'business_offer' ? 'bg-emerald-100 text-emerald-700' :
                  location.type === 'popular' ? 'bg-blue-100 text-blue-700' :
                  location.type === 'weekly_winner' ? 'bg-purple-100 text-purple-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {location.badge}
                </span>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add New Location Card */}
        <div 
          onClick={() => onLocationClick('add-new')}
          className="flex-shrink-0 w-32 bg-gradient-to-br from-primary/10 to-accent/5 rounded-xl border-2 border-dashed border-primary/30 p-2 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-2 shadow-sm">
            <Star className="w-3 h-3 text-primary" />
          </div>
          <p className="text-xs font-semibold text-primary text-center leading-tight">Add Place</p>
        </div>
      </div>
    </div>
  );
};

export default CommunityHighlights;