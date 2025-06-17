
import { useState, useEffect } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useMapPins } from '@/hooks/useMapPins';
import LocationDetailSheet from '@/components/LocationDetailSheet';
import CitySearch from '@/components/home/CitySearch';
import StoriesSection from '@/components/home/StoriesSection';
import LocationOfTheWeek from '@/components/home/LocationOfTheWeek';
import FilterButtons from '@/components/home/FilterButtons';
import MapSection from '@/components/home/MapSection';
import ShareModal from '@/components/home/ShareModal';
import CommentModal from '@/components/home/CommentModal';
import { Place } from '@/types/place';
import { demoStories } from '@/data/demoData';

type FilterType = 'following' | 'popular' | 'new';

const ExplorePage = () => {
  // Home state
  const [currentCity, setCurrentCity] = useState('San Francisco');
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('following');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [likedPlaces, setLikedPlaces] = useState<Set<string>>(new Set());
  
  // Modals
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  
  // Hooks
  const { location } = useGeolocation();
  const { pins, loading: pinsLoading, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);

  // Auto-update city from geolocation
  useEffect(() => {
    if (location?.city && location.city !== currentCity) {
      setCurrentCity(location.city);
    }
  }, [location?.city, currentCity]);

  // Refresh pins when city changes
  useEffect(() => {
    refreshPins(currentCity);
  }, [currentCity, refreshPins]);

  // City search handlers
  const handleCitySearchChange = (value: string) => {
    setCitySearchQuery(value);
  };

  const handleCitySearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && citySearchQuery.trim()) {
      setCurrentCity(citySearchQuery.trim());
      setCitySearchQuery('');
    }
  };

  const handleCitySelect = (city: string) => {
    setCurrentCity(city);
    setCitySearchQuery('');
  };

  // Pin/Place handlers
  const convertPinToPlace = (pin: any): Place => ({
    id: pin.id,
    name: pin.name,
    category: pin.category,
    likes: pin.likes || 0,
    friendsWhoSaved: Array.isArray(pin.friendsWhoSaved) ? pin.friendsWhoSaved : [],
    visitors: Array.isArray(pin.visitors) ? pin.visitors : [],
    isNew: pin.isNew || false,
    coordinates: pin.coordinates,
    image: pin.image || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    addedBy: pin.addedBy,
    addedDate: pin.addedDate,
    isFollowing: pin.isFollowing || false,
    popularity: pin.popularity || 50,
    distance: typeof pin.distance === 'string' ? pin.distance : `${pin.distance || 0}km`,
    totalSaves: pin.totalSaves || pin.likes || 0
  });

  const handlePinClick = (pin: any) => {
    const place = convertPinToPlace(pin);
    setSelectedPlace(place);
    setDetailSheetOpen(true);
  };

  const handleCardClick = (place: Place) => {
    setSelectedPlace(place);
    setDetailSheetOpen(true);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces(prev => {
      const newLiked = new Set(prev);
      if (newLiked.has(placeId)) {
        newLiked.delete(placeId);
      } else {
        newLiked.add(placeId);
      }
      return newLiked;
    });
  };

  const handleShare = (place: Place) => {
    setSelectedPlace(place);
    setShareModalOpen(true);
  };

  const handleComment = (place: Place) => {
    setSelectedPlace(place);
    setCommentModalOpen(true);
  };

  const handleShareModalShare = (friendIds: string[], place: Place) => {
    console.log('Sharing place:', place, 'with friends:', friendIds);
    // Implement share logic here
  };

  // Get top location for Location of the Week
  const getTopLocation = () => {
    if (pins.length === 0) return null;
    // Convert pin to place format for LocationOfTheWeek
    const topPin = pins.reduce((prev, current) => 
      (prev.popularity || 0) > (current.popularity || 0) ? prev : current
    );
    return convertPinToPlace(topPin);
  };

  const topLocation = getTopLocation();

  // Calculate new pins count
  const newPinsCount = pins.filter(pin => pin.isNew).length;

  // Convert pins to places for MapSection
  const placesForMap = pins.map(convertPinToPlace);

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-blue-50/30 via-white to-purple-50/20 pt-16">
      {/* City Search Header */}
      <div className="sticky top-16 z-40 bg-white/80 backdrop-blur-sm border-b border-gray-100/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <CitySearch
            searchQuery={citySearchQuery}
            currentCity={currentCity}
            onSearchChange={handleCitySearchChange}
            onSearchKeyPress={handleCitySearchKeyPress}
            onCitySelect={handleCitySelect}
          />
        </div>
      </div>

      {/* Stories Section */}
      <div className="px-4 py-4 bg-white/60 backdrop-blur-sm">
        <StoriesSection 
          stories={demoStories}
          onCreateStory={() => console.log('Create story')}
          onStoryClick={(index) => console.log('Story clicked:', index)}
        />
      </div>

      {/* Location of the Week */}
      {topLocation && (
        <LocationOfTheWeek
          topLocation={topLocation}
          onLocationClick={handleCardClick}
        />
      )}

      {/* Filter Buttons */}
      <FilterButtons
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        newCount={newPinsCount}
      />

      {/* Map Section */}
      <div className="flex-1 relative">
        <MapSection
          places={placesForMap}
          onPinClick={handlePinClick}
        />
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        item={selectedPlace}
        itemType="place"
        onShare={handleShareModalShare}
      />

      <CommentModal
        isOpen={commentModalOpen}
        onClose={() => setCommentModalOpen(false)}
        place={selectedPlace}
        onCommentSubmit={(comment) => console.log('Comment added:', comment)}
      />

      <LocationDetailSheet
        isOpen={detailSheetOpen}
        onClose={() => setDetailSheetOpen(false)}
        location={selectedPlace}
      />
    </div>
  );
};

export default ExplorePage;
