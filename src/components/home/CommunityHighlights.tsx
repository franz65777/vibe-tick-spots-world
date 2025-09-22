import React from 'react';
import { MapPin, Heart, Users, Star, Crown, Sparkles } from 'lucide-react';
import { useWeeklyWinner } from '@/hooks/useWeeklyWinner';
import { useCommunityChampions } from '@/hooks/useCommunityChampions';

interface CommunityHighlightsProps {
  currentCity: string;
  onLocationClick: (locationId: string) => void;
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
  onLocationClick, 
  onUserClick, 
  onMapLocationClick 
}: CommunityHighlightsProps) => {
  const { location: weeklyWinner, loading: winnerLoading } = useWeeklyWinner(currentCity);
  const { champions, loading: championsLoading } = useCommunityChampions(currentCity);
  
  const featuredLocations = getMockFeaturedLocations(currentCity);

  return (
    <div className="px-4 py-2">
      <h3 className="text-sm font-semibold text-foreground mb-3">Discover Nearby</h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {featuredLocations.map((location) => (
          <div 
            key={location.id}
            onClick={() => onLocationClick(location.id)}
            className="flex-shrink-0 w-64 bg-card rounded-xl border border-border p-3 cursor-pointer hover:shadow-md transition-all duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="relative">
                <img 
                  src={location.image} 
                  alt={location.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <div className="absolute -top-1 -right-1">
                  {location.type === 'business_offer' && (
                    <div className="bg-green-500 rounded-full p-1">
                      <Sparkles className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {location.type === 'popular' && (
                    <div className="bg-blue-500 rounded-full p-1">
                      <Users className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {location.type === 'weekly_winner' && (
                    <div className="bg-purple-500 rounded-full p-1">
                      <Crown className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-semibold text-sm text-foreground truncate">{location.name}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ml-2 ${
                    location.type === 'business_offer' ? 'bg-green-100 text-green-700' :
                    location.type === 'popular' ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'
                  }`}>
                    {location.badge}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{location.description}</p>
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Heart className="w-3 h-3" />
                    <span>{location.stats.saves}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{location.stats.followers}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Add New Location Card */}
        <div 
          onClick={() => onLocationClick('add-new')}
          className="flex-shrink-0 w-32 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border-2 border-dashed border-primary/20 p-3 cursor-pointer hover:border-primary/40 transition-all duration-200 flex flex-col items-center justify-center"
        >
          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Star className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs font-medium text-primary text-center">Add Amazing Place</p>
        </div>
      </div>
    </div>
  );
};

export default CommunityHighlights;