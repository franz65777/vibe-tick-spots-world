import React from 'react';
import { MapPin, Heart, Users, Star, Crown, Sparkles, TrendingUp } from 'lucide-react';
import { useNearbyLocations } from '@/hooks/useNearbyLocations';
import { cn } from '@/lib/utils';

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
  // Use the mock data for now
  const locations = getMockFeaturedLocations(currentCity);

  return (
    <div className="w-full px-4 py-6">
      {/* Minimal Header */}
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 bg-clip-text text-transparent mb-2">
          Discover {currentCity}
        </h2>
        <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto"></div>
      </div>

      {/* Grid Layout for Cards */}
      <div className="grid grid-cols-1 gap-4">
        {locations.map((location, index) => (
          <div 
            key={location.id}
            className="bg-white/80 backdrop-blur-xl rounded-3xl border-0 overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => onLocationClick(location.id)}
          >
            <div className="relative">
              {/* Premium Gradient Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10"></div>
              
              <div className="relative flex items-center gap-4 p-5">
                {/* Enhanced Location Image */}
                <div className="relative w-14 h-14 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg">
                  <img
                    src={location.image}
                    alt={location.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                    {location.name[0]}
                  </div>
                  
                  {/* Glow Effect */}
                  <div className="absolute -inset-1 bg-gradient-to-br from-blue-400 via-indigo-400 to-purple-500 opacity-0 group-hover:opacity-20 rounded-2xl blur transition-all duration-300"></div>
                </div>

                {/* Enhanced Location Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {location.name}
                      </h3>
                      <p className="text-sm text-gray-500 truncate mt-1 leading-tight">
                        {location.description}
                      </p>
                    </div>
                    
                    {/* Enhanced Badge */}
                    {location.badge && (
                      <div className={cn(
                        "px-3 py-1.5 rounded-full text-xs font-bold shrink-0 shadow-sm",
                        location.type === 'business_offer' && "bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200",
                        location.type === 'popular' && "bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 border border-blue-200", 
                        location.type === 'weekly_winner' && "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 border border-purple-200"
                      )}>
                        {location.badge}
                      </div>
                    )}
                  </div>

                  {/* Enhanced Stats */}
                  <div className="flex items-center gap-5 mt-3">
                    <div className="flex items-center gap-2 text-gray-600 group-hover:text-pink-600 transition-colors">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-medium">{location.stats.saves}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600 group-hover:text-blue-600 transition-colors">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">{location.stats.followers}</span>
                    </div>
                    {location.type === 'weekly_winner' && (
                      <div className="flex items-center gap-2 text-purple-600 group-hover:text-purple-700 transition-colors">
                        <Crown className="w-4 h-4" />
                        <span className="text-sm font-bold">Featured</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommunityHighlights;