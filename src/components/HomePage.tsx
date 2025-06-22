
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { backendService } from '@/services/backendService';
import { searchService } from '@/services/searchService';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import CategoryFilters, { CategoryType } from './home/CategoryFilters';
import PlaceCard from './home/PlaceCard';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import MapSection from './home/MapSection';
import ModalsManager from './home/ModalsManager';

const HomePage = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'following' | 'popular' | 'new'>('following');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
  const [places, setPlaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showAddLocation, setShowAddLocation] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('New York');
  const [stories, setStories] = useState<any[]>([]);
  const [topLocation, setTopLocation] = useState<any>(null);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  const [savedPlaces, setSavedPlaces] = useState<Set<string>>(new Set());

  // Load places based on current filters
  useEffect(() => {
    const loadPlaces = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get all location recommendations
        const locations = await searchService.getLocationRecommendations(user.id);
        
        let filteredPlaces = locations;
        
        // Apply category filter
        if (selectedCategory !== 'all') {
          filteredPlaces = locations.filter(place => 
            place.category?.toLowerCase().includes(selectedCategory.toLowerCase())
          );
        }
        
        // Apply view filter
        switch (currentView) {
          case 'popular':
            filteredPlaces = filteredPlaces.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            break;
          case 'new':
            filteredPlaces = filteredPlaces.filter(place => place.isNew);
            break;
          case 'following':
            // For now, show all places since we don't have following-specific logic
            break;
        }
        
        setPlaces(filteredPlaces);
        
        // Set top location for Location of the Week
        if (filteredPlaces.length > 0) {
          setTopLocation(filteredPlaces[0]);
        }
      } catch (error) {
        console.error('Error loading places:', error);
        setPlaces([]);
      } finally {
        setLoading(false);
      }
    };

    loadPlaces();
  }, [user, currentView, selectedCategory]);

  const handlePlaceClick = (place: any) => {
    setSelectedPlace(place);
  };

  const handleComment = (place: any) => {
    setSelectedPlace(place);
    setShowComments(true);
  };

  const handleShare = (place: any) => {
    setSelectedPlace(place);
    setShowShare(true);
  };

  const handleAddLocation = () => {
    setShowAddLocation(true);
  };

  const handleMessages = () => {
    setShowMessages(true);
  };

  const handleNotifications = () => {
    // Handle notifications
  };

  const handleCreateStory = () => {
    // Handle create story
  };

  const handleStoryClick = (index: number) => {
    // Handle story click
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(placeId)) {
        newSet.delete(placeId);
      } else {
        newSet.add(placeId);
      }
      return newSet;
    });
  };

  const handleSaveToggle = (place: any) => {
    setSavedPlaces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(place.id)) {
        newSet.delete(place.id);
      } else {
        newSet.add(place.id);
      }
      return newSet;
    });
  };

  const handleLocationClick = (place: any) => {
    setSelectedPlace(place);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Handle search
    }
  };

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
  };

  const mapCenter = { lat: 40.7128, lng: -74.0060 }; // Default to NYC

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={handleSearchKeyPress}
        onNotificationsClick={handleNotifications}
        onMessagesClick={handleMessages}
        onCreateStoryClick={handleCreateStory}
        onCitySelect={handleCitySelect}
      />
      
      <div className="pt-16">
        <StoriesSection 
          stories={stories}
          onCreateStory={handleCreateStory}
          onStoryClick={handleStoryClick}
        />
        
        <FilterButtons
          activeFilter={currentView}
          onFilterChange={setCurrentView}
          onCityChange={setCurrentCity}
          hasFollowedUsers={true}
        />
        
        <CategoryFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        
        <LocationOfTheWeek 
          topLocation={topLocation}
          onLocationClick={handleLocationClick}
        />
        
        <div className="px-4 py-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : places.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">No places found</h3>
              <p className="text-gray-500">
                {selectedCategory === 'all' 
                  ? 'Try switching to a different view or check back later'
                  : `No ${selectedCategory} places found. Try a different category.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {places.map((place) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  isLiked={likedPlaces.has(place.id)}
                  isSaved={savedPlaces.has(place.id)}
                  onCardClick={handlePlaceClick}
                  onLikeToggle={handleLikeToggle}
                  onSaveToggle={handleSaveToggle}
                  onShare={handleShare}
                  onComment={handleComment}
                  cityName={currentCity}
                />
              ))}
            </div>
          )}
        </div>
        
        <MapSection 
          places={places}
          onPinClick={handlePlaceClick}
          mapCenter={mapCenter}
          selectedPlace={selectedPlace}
          onCloseSelectedPlace={() => setSelectedPlace(null)}
        />
      </div>

      <ModalsManager
        isCreateStoryModalOpen={false}
        isNotificationsModalOpen={false}
        isMessagesModalOpen={showMessages}
        isShareModalOpen={showShare}
        isCommentModalOpen={showComments}
        isLocationDetailOpen={false}
        isStoriesViewerOpen={false}
        sharePlace={selectedPlace}
        commentPlace={selectedPlace}
        locationDetailPlace={null}
        stories={stories}
        currentStoryIndex={0}
        onCreateStoryModalClose={() => {}}
        onNotificationsModalClose={() => {}}
        onMessagesModalClose={() => setShowMessages(false)}
        onShareModalClose={() => setShowShare(false)}
        onCommentModalClose={() => setShowComments(false)}
        onLocationDetailClose={() => {}}
        onStoriesViewerClose={() => {}}
        onStoryCreated={() => {}}
        onShare={(friendIds: string[], place: any) => {}}
        onCommentSubmit={(text: string, place: any) => {}}
        onStoryViewed={(storyId: string) => {}}
      />
    </div>
  );
};

export default HomePage;
