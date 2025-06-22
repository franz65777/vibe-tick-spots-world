
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onAddLocation={handleAddLocation}
        onMessages={handleMessages}
      />
      
      <div className="pt-16">
        <StoriesSection />
        
        <FilterButtons
          currentView={currentView}
          onViewChange={setCurrentView}
        />
        
        <CategoryFilters
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
        />
        
        <LocationOfTheWeek />
        
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
                  onCardClick={handlePlaceClick}
                  onComment={handleComment}
                  onShare={handleShare}
                />
              ))}
            </div>
          )}
        </div>
        
        <MapSection places={places} />
      </div>

      <ModalsManager
        selectedPlace={selectedPlace}
        showComments={showComments}
        showShare={showShare}
        showAddLocation={showAddLocation}
        showMessages={showMessages}
        onCloseComments={() => setShowComments(false)}
        onCloseShare={() => setShowShare(false)}
        onCloseAddLocation={() => setShowAddLocation(false)}
        onCloseMessages={() => setShowMessages(false)}
      />
    </div>
  );
};

export default HomePage;
