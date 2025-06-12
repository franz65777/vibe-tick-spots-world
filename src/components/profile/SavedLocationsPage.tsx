
import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Filter, MapPin, Heart } from 'lucide-react';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SavedLocationsPageProps {
  onClose: () => void;
}

const SavedLocationsPage = ({ onClose }: SavedLocationsPageProps) => {
  const { savedPlaces, loading } = useSavedPlaces();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [sortBy, setSortBy] = useState('name');

  // Get all saved places as a flat array
  const allSavedPlaces = useMemo(() => {
    const places = [];
    for (const [city, cityPlaces] of Object.entries(savedPlaces)) {
      places.push(...cityPlaces);
    }
    return places;
  }, [savedPlaces]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    return Object.keys(savedPlaces);
  }, [savedPlaces]);

  // Filter and sort places
  const filteredPlaces = useMemo(() => {
    let filtered = allSavedPlaces;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(place =>
        place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        place.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by city
    if (selectedCity && selectedCity !== 'all') {
      filtered = filtered.filter(place => place.city === selectedCity);
    }

    // Sort places
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'city':
          return a.city.localeCompare(b.city);
        case 'date':
          return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
        case 'category':
          return a.category.localeCompare(b.category);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allSavedPlaces, searchQuery, selectedCity, sortBy]);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'cafe':
        return '☕';
      case 'restaurant':
        return '🍽️';
      case 'bar':
        return '🍷';
      case 'hotel':
        return '🏨';
      case 'attraction':
        return '🎯';
      case 'entertainment':
        return '🎭';
      default:
        return '📍';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your saved locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">Saved Locations</h1>
            <p className="text-sm text-gray-600">{filteredPlaces.length} locations</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All cities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All cities</SelectItem>
                {cities.map(city => (
                  <SelectItem key={city} value={city}>{city}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="city">City</SelectItem>
                <SelectItem value="date">Date saved</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Locations List */}
      <div className="p-4">
        {filteredPlaces.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No locations found</h3>
            <p className="text-gray-600">
              {searchQuery || selectedCity !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Start exploring and save your favorite places!'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {getCategoryIcon(place.category)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {place.name}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {place.category} • {place.city}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
                        <Heart className="w-4 h-4" />
                        <span>Saved</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>Saved on {formatDate(place.savedAt)}</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{place.coordinates.lat.toFixed(4)}, {place.coordinates.lng.toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedLocationsPage;
