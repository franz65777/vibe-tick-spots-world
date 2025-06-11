
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from './BottomNavigation';
import SearchHeader from './explore/SearchHeader';
import SearchResults from './explore/SearchResults';
import LocationRecommendations from './explore/LocationRecommendations';
import UserRecommendations from './explore/UserRecommendations';
import RecommendationsSection from './explore/RecommendationsSection';

// Define unified Place interface
interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved: { name: string; avatar: string; }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviews: number;
  distance: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean };
  addedDate: string;
  image: string;
  description?: string;
  totalSaves: number;
}

const ExplorePage = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recommendations, setRecommendations] = useState<Place[]>([]);

  // Demo data
  useEffect(() => {
    const demoRecommendations: Place[] = [
      {
        id: '1',
        name: 'Central Park',
        category: 'Park',
        likes: 342,
        friendsWhoSaved: [
          { name: 'Emma', avatar: '/api/placeholder/32/32' },
          { name: 'Alex', avatar: '/api/placeholder/32/32' }
        ],
        visitors: ['Emma', 'Alex', 'Sara'],
        isNew: false,
        coordinates: { lat: 40.7829, lng: -73.9654 },
        rating: 4.9,
        reviews: 1200,
        distance: '2.1 km',
        addedBy: { name: 'Emma', avatar: '/api/placeholder/32/32', isFollowing: true },
        addedDate: '2024-01-10',
        image: '/api/placeholder/400/300',
        description: 'Beautiful urban park in Manhattan',
        totalSaves: 342
      },
      {
        id: '2',
        name: 'Brooklyn Bridge',
        category: 'Historic',
        likes: 523,
        friendsWhoSaved: [
          { name: 'John', avatar: '/api/placeholder/32/32' }
        ],
        visitors: ['John', 'Lisa', 'Mike'],
        isNew: true,
        coordinates: { lat: 40.7061, lng: -73.9969 },
        rating: 4.8,
        reviews: 890,
        distance: '3.5 km',
        addedBy: { name: 'John', avatar: '/api/placeholder/32/32', isFollowing: false },
        addedDate: '2024-01-20',
        image: '/api/placeholder/400/300',
        description: 'Iconic suspension bridge connecting Manhattan and Brooklyn',
        totalSaves: 523
      }
    ];
    setRecommendations(demoRecommendations);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate search
    setTimeout(() => {
      const results = recommendations.filter(place => 
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
      setIsSearching(false);
    }, 1000);
  };

  const handlePlaceClick = (place: Place) => {
    console.log('Place clicked:', place.name);
  };

  const hasSearchQuery = searchQuery.trim().length > 0;
  const showResults = hasSearchQuery && searchResults.length > 0;

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <SearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onSearch={handleSearch}
      />
      
      <div className="flex-1 overflow-auto pb-20">
        {showResults ? (
          <SearchResults 
            results={searchResults}
            isLoading={isSearching}
            onPlaceClick={handlePlaceClick}
          />
        ) : (
          <>
            <LocationRecommendations 
              recommendations={recommendations}
              onPlaceClick={handlePlaceClick}
            />
            
            <UserRecommendations />
            
            <RecommendationsSection />
          </>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ExplorePage;
