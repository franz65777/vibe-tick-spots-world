
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
  const { savedPlaces, savePlace, unsavePlace } = useSavedPlaces();
  const { location: userLocation } = useGeolocation();

  console.log('HomePage: user =', user?.email);
  console.log('HomePage: backendPlaces =', backendPlaces);
  console.log('HomePage: loading =', loading);

  // Convert backend places to local HomePlace format
  const convertBackendPlace = (backendPlace: any): HomePlace => {
    return {
      id: backendPlace.id,
      name: backendPlace.name,
      category: backendPlace.category,
      rating: 4.5, // Default rating since BackendPlace doesn't have this
      image: backendPlace.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
      description: backendPlace.description || 'Great place to visit',
      location: {
        lat: backendPlace.latitude || 37.7749,
        lng: backendPlace.longitude || -122.4194
      },
      address: backendPlace.address || 'City Center',
      visitors: [],
      friendsWhoSaved: [],
      distance: '2.5km',
      tags: [],
      priceRange: '$',
      openingHours: '9:00 AM - 10:00 PM',
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

  // Check if a place is saved - handle both object and array formats
  const isPlaceSaved = (placeId: string): boolean => {
    if (!savedPlaces) return false;
    
    if (Array.isArray(savedPlaces)) {
      return savedPlaces.some((saved: any) => saved.id === placeId);
    } else if (typeof savedPlaces === 'object') {
      return Object.values(savedPlaces).some((cityPlaces: any) => 
        Array.isArray(cityPlaces) && cityPlaces.some((saved: any) => saved.id === placeId)
      );
    }
    
    return false;
  };

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

  // Demo stories data
  const demoStories = [
    {
      id: '1',
      userId: 'user1',
      userName: 'Sarah Chen',
      userAvatar: 'https://images.unsplash.com/photo-1494790108755-2616b5a5c75b?w=100&h=100&fit=crop&crop=face',
      isViewed: false,
      locationId: '1',
      locationName: 'The Cozy Corner Café',
      locationCategory: 'cafe'
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'Mike Johnson',
      userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      isViewed: true,
      locationId: '2',
      locationName: 'Sunset View Restaurant',
      locationCategory: 'restaurant'
    }
  ];

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
      />
      
      <div className="px-4 space-y-4">
        <StoriesSection 
          stories={demoStories}
          onCreateStory={() => console.log('Create story clicked')}
          onStoryClick={(index) => console.log('Story clicked:', index)}
        />
        <FilterButtons 
          onFilterChange={setSelectedFilter}
        />
        <LocationOfTheWeek 
          topLocation={{
            id: '1',
            name: 'The Cozy Corner Café',
            image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&h=300&fit=crop',
            description: 'A cozy neighborhood café with great coffee',
            category: 'cafe'
          }}
          onLocationClick={(location) => console.log('Location clicked:', location)}
        />
        
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
                  visitors: [],
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
            visitors: [],
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
            visitors: [],
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
