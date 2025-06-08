
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/home/Header';
import MapSection from '@/components/home/MapSection';
import PlaceCard from '@/components/home/PlaceCard';
import { useMapPins } from '@/hooks/useMapPins';
import { getCityCoordinates } from '@/components/home/CitySearch';

interface Place {
  id: string;
  name: string;
  category: string;
  image: string;
  likes: number;
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  tags: string[];
  openingHours: string;
  friendsWhoSaved?: { name: string; avatar: string }[];
  addedBy?: string;
  addedDate?: string;
  isFollowing?: boolean;
  popularity?: number;
}

const ExplorePage = () => {
  console.log('ExplorePage rendering...');
  
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState(' ');
  const [currentCity, setCurrentCity] = useState('San Francisco');
  const [likedPlaces, setLikedPlaces] = useState(new Set());
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  const { pins, loading, error, refreshPins } = useMapPins('popular');

  // Convert map pins to places for the explore page
  const places: Place[] = pins.map(pin => ({
    id: pin.id,
    name: pin.name,
    category: pin.category,
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop',
    likes: pin.likes,
    visitors: ['user1', 'user2'],
    isNew: false,
    coordinates: pin.coordinates,
    tags: ['great food', 'atmosphere'],
    openingHours: '8:00 AM - 10:00 PM',
    friendsWhoSaved: [
      { name: 'Sarah', avatar: 'photo-1494790108755-2616b5a5c75b' },
      { name: 'Mike', avatar: 'photo-1507003211169-0a1dd7228f2d' }
    ],
    addedBy: pin.addedBy,
    addedDate: pin.addedDate,
    isFollowing: pin.isFollowing,
    popularity: pin.popularity
  }));

  // Get map center based on current city
  const mapCenter = getCityCoordinates(currentCity) || { lat: 37.7749, lng: -122.4194 };

  // Update pins when city changes
  useEffect(() => {
    refreshPins(currentCity);
  }, [currentCity, refreshPins]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      console.log('Search for:', searchQuery);
    }
  };

  const handleCitySelect = (city: string) => {
    console.log('City selected:', city);
    setCurrentCity(city);
    setSelectedPlace(null);
  };

  const handleLikeToggle = (placeId: string) => {
    setLikedPlaces((prev) => {
      const newLiked = new Set(prev);
      if (newLiked.has(placeId)) {
        newLiked.delete(placeId);
      } else {
        newLiked.add(placeId);
      }
      return newLiked;
    });
  };

  const handlePinClick = (place: Place) => {
    console.log('Pin clicked:', place.name);
    setSelectedPlace(place);
  };

  const handlePlaceCardClick = (place: Place) => {
    console.log('Place card clicked:', place.name);
  };

  const handleShare = (place: Place) => {
    console.log('Share place:', place.name);
  };

  const handleComment = (place: Place) => {
    console.log('Comment on place:', place.name);
  };

  const handleCloseSelectedPlace = () => {
    setSelectedPlace(null);
  };

  const handleNotificationsClick = () => {
    console.log('Notifications clicked');
  };

  const handleMessagesClick = () => {
    console.log('Messages clicked');
  };

  if (!user) {
    return <div>Please log in to access the explore page.</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <Header 
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={handleSearchChange}
        onSearchKeyPress={handleSearchKeyPress}
        onCitySelect={handleCitySelect}
        onNotificationsClick={handleNotificationsClick}
        onMessagesClick={handleMessagesClick}
      />

      {/* Map Section */}
      <MapSection 
        places={places}
        onPinClick={handlePinClick}
        mapCenter={mapCenter}
        selectedPlace={selectedPlace}
        onCloseSelectedPlace={handleCloseSelectedPlace}
      />

      {/* Places Grid */}
      <div className="px-4 pb-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Explore Places</h2>
          <span className="text-sm text-gray-500">{places.length} places</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-xl mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <p className="text-red-600">{error}</p>
          </div>
        ) : places.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No places found in {currentCity}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {places.map((place) => (
              <PlaceCard
                key={place.id}
                place={place}
                isLiked={likedPlaces.has(place.id)}
                onCardClick={handlePlaceCardClick}
                onLikeToggle={handleLikeToggle}
                onShare={handleShare}
                onComment={handleComment}
                cityName={currentCity}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplorePage;
