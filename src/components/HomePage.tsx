
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '@/hooks/useSearch';
import { useBackendPlaces } from '@/hooks/useBackendPlaces';
import { useMapPins } from '@/hooks/useMapPins';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useGeolocation } from '@/hooks/useGeolocation';
import Header from './home/Header';
import PlaceInteractionModal from './home/PlaceInteractionModal';
import FilterButtons from './home/FilterButtons';
import MapSection from './home/MapSection';
import StoriesSection from './home/StoriesSection';
import ModalsManager from './home/ModalsManager';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import BottomNavigation from './BottomNavigation';
import { toast } from 'sonner';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { 
    searchQuery, 
    setSearchQuery, 
    currentCity, 
    setCurrentCity,
    searchHistory,
    locationRecommendations,
    userRecommendations,
    refreshRecommendations 
  } = useSearch();
  
  const { places, isLoading } = useBackendPlaces();
  const { 
    savedPlaces, 
    savePlace, 
    unsavePlace, 
    isPlaceSaved 
  } = useSavedPlaces();
  const { location } = useGeolocation();
  
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isCreateStoryModalOpen, setIsCreateStoryModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isMessagesModalOpen, setIsMessagesModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isDetailSheetOpen, setIsDetailSheetOpen] = useState(false);
  const [isSaveLocationDialogOpen, setIsSaveLocationDialogOpen] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedStory, setSelectedStory] = useState(null);
  const [isStoriesViewerOpen, setIsStoriesViewerOpen] = useState(false);

  // Mock stories data
  const stories = [
    {
      id: '1',
      userId: 'user1',
      userName: 'Alice',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b332c26c?w=100&h=100&fit=crop&crop=face',
      content: 'Amazing sunset at this rooftop restaurant! 🌅',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      isViewed: false,
      duration: 5000,
      media: {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400&h=600&fit=crop'
      }
    }
  ];

  const { 
    mapPins, 
    selectedPin, 
    setSelectedPin, 
    handlePinClick 
  } = useMapPins({
    places: places.filter(place => 
      selectedCategory === 'all' || place.category === selectedCategory
    ),
    onPlaceSelect: (place) => {
      setSelectedPlace(place);
      setIsDetailSheetOpen(true);
    }
  });

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const filtered = places.filter(place =>
        place.name.toLowerCase().includes(query.toLowerCase()) ||
        place.description?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch(searchQuery);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
  };

  const handleSavePlace = async (place) => {
    try {
      if (isPlaceSaved(place.id)) {
        await unsavePlace(place.id);
        toast.success('Location removed from saved places');
      } else {
        await savePlace(place);
        toast.success('Location saved successfully!');
      }
    } catch (error) {
      toast.error('Failed to save location');
    }
  };

  const handleStoryClick = (story) => {
    setSelectedStory(story);
    setIsStoriesViewerOpen(true);
  };

  // Redirect to auth if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-screen overflow-hidden">
        <Header 
          searchQuery={searchQuery}
          currentCity={currentCity}
          onSearchChange={setSearchQuery}
          onSearchKeyPress={handleSearchKeyPress}
          onCityChange={setCurrentCity}
          onCreateStory={() => setIsCreateStoryModalOpen(true)}
        />
        
        <StoriesSection 
          stories={stories}
          onStoryClick={handleStoryClick}
        />
        
        <FilterButtons 
          onCategoryClick={handleCategoryClick}
        />
        
        <div className="absolute inset-0 pt-32">
          <MapSection
            places={places.map(place => ({
              ...place,
              isNew: false,
              coordinates: place.coordinates || { lat: 0, lng: 0 }
            }))}
            selectedCategory={selectedCategory}
            onPlaceSelect={(place) => {
              setSelectedPlace(place);
              setIsDetailSheetOpen(true);
            }}
          />
        </div>

        <ModalsManager 
          isCreateStoryModalOpen={isCreateStoryModalOpen}
          isNotificationsModalOpen={isNotificationsModalOpen}
          isMessagesModalOpen={isMessagesModalOpen}
          isShareModalOpen={isShareModalOpen}
          isCommentModalOpen={isCommentModalOpen}
          isDetailSheetOpen={isDetailSheetOpen}
          isSaveLocationDialogOpen={isSaveLocationDialogOpen}
          isStoriesViewerOpen={isStoriesViewerOpen}
          selectedPlace={selectedPlace}
          selectedStory={selectedStory}
          searchResults={searchResults}
          isSearching={isSearching}
          searchKeyword={searchKeyword}
          onCreateStoryModalClose={() => setIsCreateStoryModalOpen(false)}
          onNotificationsModalClose={() => setIsNotificationsModalOpen(false)}
          onMessagesModalClose={() => setIsMessagesModalOpen(false)}
          onShareModalClose={() => setIsShareModalOpen(false)}
          onCommentModalClose={() => setIsCommentModalOpen(false)}
          onDetailSheetClose={() => setIsDetailSheetOpen(false)}
          onSaveLocationDialogClose={() => setIsSaveLocationDialogClose(false)}
          onStoriesViewerClose={() => setIsStoriesViewerOpen(false)}
          onSavePlace={handleSavePlace}
          onSearchKeywordChange={setSearchKeyword}
        />
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default HomePage;
