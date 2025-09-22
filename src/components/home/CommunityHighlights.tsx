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
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary/60 rounded-full"></div>
        <h3 className="text-lg font-bold text-foreground bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
          Discover Nearby
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent"></div>
      </div>
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-3">
        {locations.map((location) => (
          <div 
            key={location.id}
            onClick={() => onLocationClick(location.id, location.coordinates)}
            className="flex-shrink-0 w-72 bg-gradient-to-br from-card to-card/90 rounded-2xl border border-border/50 p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all duration-300 backdrop-blur-sm"
          >
            <div className="flex items-start gap-4">
              <div className="relative">
                <img 
                  src={location.image} 
                  alt={location.name}
                  className="w-16 h-16 rounded-xl object-cover shadow-md"
                />
                <div className="absolute -top-2 -right-2">
                  {location.type === 'business_offer' && (
                    <div className="bg-gradient-to-r from-emerald-500 to-green-500 rounded-full p-1.5 shadow-lg">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {location.type === 'popular' && (
                    <div className="bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full p-1.5 shadow-lg">
                      <TrendingUp className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {location.type === 'weekly_winner' && (
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1.5 shadow-lg">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {location.type === 'trending' && (
                    <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-1.5 shadow-lg">
                      <Star className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-base text-foreground truncate">{location.name}</h4>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold flex-shrink-0 ml-2 shadow-sm ${
                    location.type === 'business_offer' ? 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200' :
                    location.type === 'popular' ? 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 border border-blue-200' :
                    location.type === 'weekly_winner' ? 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200' :
                    'bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 border border-orange-200'
                  }`}>
                    {location.badge}
                  </span>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">{location.description}</p>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span className="font-medium">{location.stats.saves}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">{location.stats.followers}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium">{location.stats.likes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add New Location Card */}
        <div 
          onClick={() => onLocationClick('add-new')}
          className="flex-shrink-0 w-40 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 rounded-2xl border-2 border-dashed border-primary/30 p-4 cursor-pointer hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col items-center justify-center backdrop-blur-sm"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full flex items-center justify-center mb-2 shadow-sm">
            <Star className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-semibold text-primary text-center leading-tight">Add Amazing Place</p>
          <p className="text-xs text-muted-foreground text-center mt-1">Share your discovery</p>
        </div>
      </div>
    </div>
  );
};

export default CommunityHighlights;