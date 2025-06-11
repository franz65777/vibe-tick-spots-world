
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import BottomNavigation from './BottomNavigation';
import SearchHeader from './explore/SearchHeader';
import SearchFilters from './explore/SearchFilters';
import SearchResults from './explore/SearchResults';
import SearchSuggestions from './explore/SearchSuggestions';
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
  const [sortBy, setSortBy] = useState<'proximity' | 'likes' | 'followers'>('proximity');
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestions] = useState<string[]>(['Museums', 'Restaurants', 'Parks', 'Cafes']);
  const [searchHistory] = useState<string[]>(['Gamla Stan', 'Vasa Museum']);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Simulate search with demo data
    const demoResults: Place[] = [
      {
        id: 'search-1',
        name: 'Fotografiska',
        category: 'Museum',
        likes: 156,
        friendsWhoSaved: [
          { name: 'Anna', avatar: '/api/placeholder/32/32' }
        ],
        visitors: ['Anna', 'Erik'],
        isNew: false,
        coordinates: { lat: 59.3167, lng: 18.0844 },
        rating: 4.6,
        reviews: 78,
        distance: '2.1 km',
        addedBy: { name: 'Anna', avatar: '/api/placeholder/32/32', isFollowing: true },
        addedDate: '2024-01-08',
        image: '/api/placeholder/400/300',
        description: 'Contemporary photography museum',
        totalSaves: 156
      }
    ].filter(place => 
      place.name.toLowerCase().includes(query.toLowerCase()) ||
      place.category.toLowerCase().includes(query.toLowerCase())
    );

    setTimeout(() => {
      setSearchResults(demoResults);
      setIsSearching(false);
    }, 500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  };

  const handlePlaceClick = (place: Place) => {
    console.log('Place clicked:', place);
  };

  const handleSavePlace = (placeId: string) => {
    console.log('Saving place:', placeId);
  };

  const showResults = searchQuery.trim().length > 0;
  const showSuggestions = !showResults && !isSearching;

  return (
    <div className="flex flex-col h-screen bg-white">
      <SearchHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearch={handleSearchSubmit}
      />
      
      <div className="flex-1 overflow-auto pb-20">
        {showSuggestions && (
          <>
            <SearchSuggestions 
              suggestions={suggestions}
              searchHistory={searchHistory}
              onSuggestionClick={setSearchQuery} 
            />
            <RecommendationsSection 
              searchMode="locations"
              loading={false}
              locationRecommendations={[]}
              userRecommendations={[]}
              onLocationClick={() => {}}
              onUserClick={() => {}}
              onFollowUser={() => {}}
              onLocationShare={() => {}}
              onLocationComment={() => {}}
              onLocationLike={() => {}}
              likedPlaces={new Set()}
            />
          </>
        )}
        
        {showResults && (
          <>
            <SearchFilters
              sortBy={sortBy}
              onSortChange={setSortBy}
              showFilters={true}
            />
            
            <SearchResults
              results={searchResults}
              isLoading={isSearching}
              onPlaceClick={handlePlaceClick}
              onSavePlace={handleSavePlace}
            />
          </>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default ExplorePage;
