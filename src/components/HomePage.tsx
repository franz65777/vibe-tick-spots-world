
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Header from './home/Header';
import StoriesSection from './home/StoriesSection';
import FilterButtons from './home/FilterButtons';
import PlaceCard from './home/PlaceCard';
import MapSection from './home/MapSection';
import LocationOfTheWeek from './home/LocationOfTheWeek';
import ModalsManager from './home/ModalsManager';
import { useBackendPlaces } from '@/hooks/useBackendPlaces';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { useGeolocation } from '@/hooks/useGeolocation';
import type { Place as BackendPlace } from '@/types/place';

// Local interface for HomePage component - using a different name to avoid conflicts
interface HomePlace {
  id: string;
  name: string;
  category: string;
  rating: number;
  image: string;
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  visitors: string[];
  friendsWhoSaved: { name: string; avatar: string; }[];
  distance?: string;
  tags?: string[];
  priceRange?: string;
  openingHours?: string;
  website?: string;
  phone?: string;
}

const HomePage = () => {
  const { user } = useAuth();
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<HomePlace | null>(null);
  const [sharePlace, setSharePlace] = useState<HomePlace | null>(null);
  const [commentPlace, setCommentPlace] = useState<HomePlace | null>(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [currentCity, setCurrentCity] = useState('New York');

  const { places: backendPlaces, loading } = useBackendPlaces();
  const { savedPlaces, savePlace, unsavePlace, isPlaceSaved } = useSavedPlaces();
  const { location: userLocation } = useGeolocation();

  console.log('HomePage: user =', user?.email);
  console.log('HomePage: backendPlaces =', backendPlaces);
  console.log('HomePage: loading =', loading);

  // Convert backend places to local HomePlace format
  const convertBackendPlace = (backendPlace: BackendPlace): HomePlace => {
    return {
      id: backendPlace.id,
      name: backendPlace.name,
      category: backendPlace.category,
      rating: 4.5, // Default rating since BackendPlace doesn't have this
      image: backendPlace.image || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      description: 'Great place to visit', // Default description
      location: backendPlace.coordinates,
      address: 'City Center', // Default address
      visitors: Array.isArray(backendPlace.visitors) ? backendPlace.visitors.map(String) : [],
      friendsWhoSaved: Array.isArray(backendPlace.friendsWhoSaved) ? backendPlace.friendsWhoSaved : [],
      distance: typeof backendPlace.distance === 'number' ? `${backendPlace.distance}km` : backendPlace.distance,
      tags: backendPlace.tags,
      priceRange: backendPlace.priceRange,
      openingHours: backendPlace.openingHours,
      website: backendPlace.website,
      phone: backendPlace.phone,
    };
  };

  const places: HomePlace[] = backendPlaces.map(convertBackendPlace);

  const filteredPlaces = places.filter(place => {
    const matchesFilter = selectedFilter === 'All' || place.category === selectedFilter;
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         place.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handlePlaceSelect = (place: HomePlace) => {
    setSelectedPlace(place);
    setShowLocationDetail(true);
  };

  const handleShare = (place: HomePlace) => {
    setSharePlace(place);
  };

  const handleComment = (place: HomePlace) => {
    setCommentPlace(place);
  };

  const handleSave = (place: HomePlace) => {
    if (isPlaceSaved(place.id)) {
      unsavePlace(place.id, currentCity);
    } else {
      savePlace({
        id: place.id,
        name: place.name,
        category: place.category,
        city: currentCity,
        coordinates: place.location
      });
    }
  };

  const handleCityChange = (city: string) => {
    setCurrentCity(city);
  };

  const handleMapToggle = () => {
    setIsMapOpen(!isMapOpen);
  };

  useEffect(() => {
    if (userLocation) {
      console.log('User location updated:', userLocation);
    }
  }, [userLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading amazing places...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentCity={currentCity}
        onMapToggle={handleMapToggle}
      />
      
      <div className="px-4 space-y-4">
        <StoriesSection />
        <FilterButtons 
          selectedFilter={selectedFilter}
          onFilterChange={setSelectedFilter}
        />
        <LocationOfTheWeek />
        
        <div className="space-y-4">
          {filteredPlaces.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No places found matching your criteria.</p>
            </div>
          ) : (
            filteredPlaces.map((place) => (
              <PlaceCard
                key={place.id}
                place={{
                  id: place.id,
                  name: place.name,
                  category: place.category,
                  likes: 0,
                  friendsWhoSaved: place.friendsWhoSaved.length,
                  visitors: place.visitors.length,
                  isNew: false,
                  coordinates: place.location,
                  image: place.image,
                  addedBy: {
                    name: 'Explorer',
                    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
                    isFollowing: false
                  },
                  addedDate: new Date().toISOString(),
                  isFollowing: false,
                  popularity: 0,
                  distance: place.distance,
                  totalSaves: 0
                }}
                onCardClick={() => handlePlaceSelect(place)}
                onShare={() => handleShare(place)}
                onComment={() => handleComment(place)}
                onSave={() => handleSave(place)}
                isSaved={isPlaceSaved(place.id)}
                cityName={currentCity}
              />
            ))
          )}
        </div>
      </div>

      {isMapOpen && (
        <MapSection
          places={filteredPlaces.map(place => ({
            id: place.id,
            name: place.name,
            category: place.category,
            likes: 0,
            friendsWhoSaved: place.friendsWhoSaved.length,
            visitors: place.visitors.length,
            isNew: false,
            coordinates: place.location,
            image: place.image,
            addedBy: {
              name: 'Explorer',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
              isFollowing: false
            },
            addedDate: new Date().toISOString(),
            isFollowing: false,
            popularity: 0,
            distance: place.distance,
            totalSaves: 0
          }))}
          onPlaceSelect={(place) => handlePlaceSelect(filteredPlaces.find(p => p.id === place.id)!)}
          selectedPlace={selectedPlace ? {
            id: selectedPlace.id,
            name: selectedPlace.name,
            category: selectedPlace.category,
            likes: 0,
            friendsWhoSaved: selectedPlace.friendsWhoSaved.length,
            visitors: selectedPlace.visitors.length,
            isNew: false,
            coordinates: selectedPlace.location,
            image: selectedPlace.image,
            addedBy: {
              name: 'Explorer',
              avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
              isFollowing: false
            },
            addedDate: new Date().toISOString(),
            isFollowing: false,
            popularity: 0,
            distance: selectedPlace.distance,
            totalSaves: 0
          } : null}
          onClose={() => setIsMapOpen(false)}
        />
      )}

      <ModalsManager
        selectedPlace={selectedPlace}
        sharePlace={sharePlace}
        commentPlace={commentPlace}
        showLocationDetail={showLocationDetail}
        onCloseLocationDetail={() => {
          setShowLocationDetail(false);
          setSelectedPlace(null);
        }}
        onCloseShare={() => setSharePlace(null)}
        onCloseComment={() => setCommentPlace(null)}
      />
    </div>
  );
};

export default HomePage;
