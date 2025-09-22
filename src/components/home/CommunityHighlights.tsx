import React from 'react';
import WeeklyWinner from './WeeklyWinner';
import CommunityChampions from './CommunityChampions';
import BusinessSpotlight from './BusinessSpotlight';
import { useWeeklyWinner } from '@/hooks/useWeeklyWinner';
import { useCommunityChampions } from '@/hooks/useCommunityChampions';

interface CommunityHighlightsProps {
  currentCity: string;
  onLocationClick: (locationId: string) => void;
  onUserClick: (userId: string) => void;
  onMapLocationClick: (coordinates: { lat: number; lng: number }) => void;
}

const CommunityHighlights = ({ 
  currentCity, 
  onLocationClick, 
  onUserClick, 
  onMapLocationClick 
}: CommunityHighlightsProps) => {
  const { location: weeklyWinner, loading: winnerLoading } = useWeeklyWinner(currentCity);
  const { champions, loading: championsLoading } = useCommunityChampions(currentCity);

  // Mock business spotlight data - in real app this would come from API
  const featuredBusiness = {
    id: 'business-1',
    name: 'Café Central',
    type: 'café',
    description: 'Authentic Italian coffee and pastries in the heart of the city. Family-owned since 1987.',
    image_url: null,
    location_name: 'Downtown Café Central',
    location_address: '123 Main Street, Downtown',
    coordinates: { lat: 53.3498, lng: -6.2603 },
    rating: 4.8,
    hours: 'Open until 9 PM',
    website_url: 'https://cafecentral.com',
    promotion_text: 'Show this app for 10% off your first order!'
  };

  return (
    <div className="space-y-4 px-4 py-2">
      {/* Weekly Winner */}
      <WeeklyWinner 
        location={weeklyWinner}
        onLocationClick={onLocationClick}
      />

      {/* Community Champions and Business Spotlight Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CommunityChampions 
          champions={champions}
          onUserClick={onUserClick}
        />
        
        <BusinessSpotlight
          business={featuredBusiness}
          onBusinessClick={(id) => console.log('Business clicked:', id)}
          onLocationClick={onMapLocationClick}
        />
      </div>
    </div>
  );
};

export default CommunityHighlights;