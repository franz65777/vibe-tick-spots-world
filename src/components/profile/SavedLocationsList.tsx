
import { useState, useMemo } from 'react';
import { ArrowLeft, Search, Filter, MapPin, Heart, Users, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';
import { cn } from '@/lib/utils';

interface SavedLocationsListProps {
  isOpen: boolean;
  onClose: () => void;
}

const SavedLocationsList = ({ isOpen, onClose }: SavedLocationsListProps) => {
  const { savedPlaces, loading } = useSavedPlaces();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [sortBy, setSortBy] = useState('recent');

  // Get all unique cities
  const cities = useMemo(() => {
    return Object.keys(savedPlaces).sort();
  }, [savedPlaces]);

  // Flatten all places with city information
  const allPlaces = useMemo(() => {
    const places = [];
    for (const [city, cityPlaces] of Object.entries(savedPlaces)) {
      places.push(...cityPlaces.map(place => ({ ...place, city })));
    }
    return places;
  }, [savedPlaces]);

  // Filter and sort places
  const filteredAndSortedPlaces = useMemo(() => {
    let filtered = allPlaces;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(place => 
        place.name.toLowerCase().includes(query) ||
        place.category.toLowerCase().includes(query) ||
        place.city.toLowerCase().includes(query)
      );
    }

    // Filter by city
    if (selectedCity !== 'all') {
      filtered = filtered.filter(place => place.city === selectedCity);
    }

    // Sort places
    switch (sortBy) {
      case 'recent':
        return filtered.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      case 'name':
        return filtered.sort((a, b) => a.name.localeCompare(b.name));
      case 'city':
        return filtered.sort((a, b) => a.city.localeCompare(b.city));
      case 'category':
        return filtered.sort((a, b) => a.category.localeCompare(b.category));
      default:
        return filtered;
    }
  }, [allPlaces, searchQuery, selectedCity, sortBy]);

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'restaurant':
        return '🍽️';
      case 'cafe':
        return '☕';
      case 'bar':
        return '🍺';
      case 'hotel':
        return '🏨';
      case 'attraction':
        return '🎭';
      case 'entertainment':
        return '🎪';
      default:
        return '📍';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Saved Locations</h1>
            <p className="text-sm text-gray-500">
              {filteredAndSortedPlaces.length} of {allPlaces.length} locations
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search locations, cities, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-gray-50 border-gray-200"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="flex-1 bg-gray-50 border-gray-200">
              <SelectValue placeholder="All Cities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {cities.map(city => (
                <SelectItem key={city} value={city}>
                  {city} ({savedPlaces[city]?.length || 0})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="flex-1 bg-gray-50 border-gray-200">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Saved</SelectItem>
              <SelectItem value="name">Name A-Z</SelectItem>
              <SelectItem value="city">City A-Z</SelectItem>
              <SelectItem value="category">Category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-gray-500">Loading saved locations...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && allPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs mx-auto px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Saved Locations</h3>
            <p className="text-gray-500 text-sm">
              Start exploring and save places you love to see them here.
            </p>
          </div>
        </div>
      )}

      {/* No Search Results */}
      {!loading && allPlaces.length > 0 && filteredAndSortedPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs mx-auto px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-500 text-sm">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        </div>
      )}

      {/* Locations List */}
      {!loading && filteredAndSortedPlaces.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            {filteredAndSortedPlaces.map((place) => (
              <div
                key={`${place.city}-${place.id}`}
                className="bg-white rounded-lg border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow"
              >
                <div className="flex gap-3">
                  {/* Category Icon */}
                  <div className="text-2xl">
                    {getCategoryIcon(place.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {place.name}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{place.city}</span>
                          <span>•</span>
                          <span className="capitalize">{place.category}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>Saved {formatDate(place.savedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MapPin className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedLocationsList;
