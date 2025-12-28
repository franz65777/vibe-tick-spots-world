import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { useMapPins } from '@/hooks/useMapPins';
import { Place } from '@/types/place';
import Header from './home/Header';
import FilterButtons from './home/FilterButtons';

const SimpleHomePage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selectedCity, setSelectedCity] = useState('');
  const [activeFilter, setActiveFilter] = useState<'following' | 'popular' | 'saved'>('following');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 37.7749, lng: -122.4194 });
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCity, setCurrentCity] = useState('');
  
  const { pins, loading, error, refreshPins, hasFollowedUsers } = useMapPins(activeFilter);

  // Convert pins to places
  const places: Place[] = pins.map(pin => ({
    id: pin.id,
    name: pin.name,
    category: pin.category,
    coordinates: pin.coordinates,
    likes: pin.likes,
    isFollowing: pin.isFollowing,
    addedBy: typeof pin.addedBy === 'string' ? pin.addedBy : pin.addedBy || 'unknown',
    addedDate: pin.addedDate,
    popularity: pin.popularity,
    city: pin.city,
    isNew: pin.isNew,
    image: pin.image,
    friendsWhoSaved: Array.isArray(pin.friendsWhoSaved) ? pin.friendsWhoSaved : [],
    visitors: Array.isArray(pin.visitors) ? pin.visitors : [],
    distance: pin.distance,
    totalSaves: pin.totalSaves,
    address: pin.address || ''
  }));

  const handleFilterChange = (filter: 'following' | 'popular' | 'saved') => {
    setActiveFilter(filter);
  };

  const handleCityChange = (city: string) => {
    console.log('HomePage - City changed to:', city, { _type: typeof city, value: JSON.stringify(city) });
    if (city && typeof city === 'string') {
      setSelectedCity(city);
      setCurrentCity(city);
      refreshPins(city);
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Welcome!</h2>
          <p className="text-muted-foreground mb-4">Please sign in to explore amazing places</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header 
        searchQuery={searchQuery}
        currentCity={currentCity}
        onSearchChange={setSearchQuery}
        onSearchKeyPress={() => {}}
        onCreateStoryClick={() => {}}
        onCitySelect={handleCityChange}
        onOpenSearchOverlay={() => {}}
      />
      
      <main className="flex-1 flex flex-col max-w-7xl mx-auto w-full">
        
        <FilterButtons 
          activeFilter={activeFilter}
          onFilterChange={handleFilterChange}
          onCityChange={handleCityChange}
          hasFollowedUsers={hasFollowedUsers}
        />
        
        <div className="flex-1 p-4 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading amazing places...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-destructive">Error loading places: {error}</p>
              <button 
                onClick={() => refreshPins()} 
                className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {activeFilter === 'following' && 'Places from people you follow'}
                {activeFilter === 'popular' && 'Popular places'}
                {activeFilter === 'saved' && 'Your saved places'}
              </h3>
              
              {places.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {places.map(place => (
                    <div key={place.id} className="bg-card rounded-lg p-4 shadow border border-border">
                      <h4 className="font-semibold text-foreground">{place.name}</h4>
                      <p className="text-muted-foreground text-sm">{place.category}</p>
                      <p className="text-muted-foreground text-xs">{place.address}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>❤️ {place.likes}</span>
                        <span>📍 {t('savesCount', { count: place.totalSaves || 0 })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No places found</p>
                  {activeFilter === 'following' && (
                    <p className="text-muted-foreground/70 text-sm mt-2">
                      Follow some users to see their favorite places here
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default SimpleHomePage;