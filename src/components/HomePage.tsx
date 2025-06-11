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

// Local interface for HomePage component
interface Place {
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
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [sharePlace, setSharePlace] = useState<Place | null>(null);
  const [commentPlace, setCommentPlace] = useState<Place | null>(null);
  const [showLocationDetail, setShowLocationDetail] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [currentCity, setCurrentCity] = useState('New York');

  const { places: backendPlaces, loading } = useBackendPlaces();
  const { savedPlaces, toggleSavePlace } = useSavedPlaces();
  const { location: userLocation } = useGeolocation();

  console.log('HomePage: user =', user?.email);
  console.log('HomePage: backendPlaces =', backendPlaces);
  console.log('HomePage: loading =', loading);

  // Convert backend places to local Place format
  const convertBackendPlace = (backendPlace: BackendPlace): Place => {
    return {
      id: backendPlace.id,
      name: backendPlace.name,
      category: backendPlace.category,
      rating: backendPlace.rating,
      image: backendPlace.image,
      description: backendPlace.description,
      location: backendPlace.location,
      address: backendPlace.address,
      visitors: Array.isArray(backendPlace.visitors) ? backendPlace.visitors : [],
      friendsWhoSaved: Array.isArray(backendPlace.friendsWhoSaved) ? backendPlace.friendsWhoSaved : [],
      distance: backendPlace.distance,
      tags: backendPlace.tags,
      priceRange: backendPlace.priceRange,
      openingHours: backendPlace.openingHours,
      website: backendPlace.website,
      phone: backendPlace.phone,
    };
  };

  const places: Place[] = backendPlaces.map(convertBackendPlace);

  const filteredPlaces = places.filter(place => {
    const matchesFilter = selectedFilter === 'All' || place.category === selectedFilter;
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         place.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handlePlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    setShowLocationDetail(true);
  };

  const handleShare = (place: Place) => {
    setSharePlace(place);
  };

  const handleComment = (place: Place) => {
    setCommentPlace(place);
  };

  const handleSave = (place: Place) => {
    toggleSavePlace(place.id);
  };

  const handleCityChange = (city: string) => {
    setCurrentCity(city);
  };

  const handleMapToggle = () => {
    setIsMapOpen(!isMapOpen);
  };

  // Determine if a place is saved
  const isPlaceSaved = (placeId: string) => {
    return savedPlaces.some(p => p.id === placeId);
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
        onCityChange={handleCityChange}
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
                place={place}
                onSelect={handlePlaceSelect}
                onShare={handleShare}
                onComment={handleComment}
                onSave={handleSave}
                isSaved={isPlaceSaved(place.id)}
              />
            ))
          )}
        </div>
      </div>

      {isMapOpen && (
        <MapSection
          places={filteredPlaces}
          onPlaceSelect={handlePlaceSelect}
          selectedPlace={selectedPlace}
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
