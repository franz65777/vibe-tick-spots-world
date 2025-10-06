
import { useState, useMemo } from 'react';
import { ArrowLeft, Search, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';

import CompactLocationCard from '@/components/explore/CompactLocationCard';

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

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(place => 
        place.name.toLowerCase().includes(query) ||
        place.category.toLowerCase().includes(query) ||
        place.city.toLowerCase().includes(query)
      );
    }

    if (selectedCity !== 'all') {
      filtered = filtered.filter(place => place.city === selectedCity);
    }

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



  if (!isOpen) return null;


  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 -ml-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold">Saved Locations</h1>
            <p className="text-sm text-muted-foreground">
              {filteredAndSortedPlaces.length} of {allPlaces.length} locations
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-background border-b border-border px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search locations, cities, or categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex gap-2">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="flex-1">
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
            <SelectTrigger className="flex-1">
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
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-muted-foreground">Loading saved locations...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && allPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs mx-auto px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Saved Locations</h3>
            <p className="text-muted-foreground text-sm">
              Start exploring and save places you love to see them here.
            </p>
          </div>
        </div>
      )}

      {/* No Search Results */}
      {!loading && allPlaces.length > 0 && filteredAndSortedPlaces.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-xs mx-auto px-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground text-sm">
              Try adjusting your search or filters to find what you're looking for.
            </p>
          </div>
        </div>
      )}

      {/* Locations List */}
      {!loading && filteredAndSortedPlaces.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-2 py-2 space-y-2">
            {filteredAndSortedPlaces.map((p) => {
              const place = {
                id: p.id,
                name: p.name,
                category: p.category,
                city: p.city,
                likes: 0,
                visitors: [],
                isNew: false,
                coordinates: { lat: 0, lng: 0 },
                google_place_id: p.id,
              } as any;
              return (
                <CompactLocationCard
                  key={`${p.city}-${p.id}`}
                  place={place}
                  onCardClick={() => {}}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavedLocationsList;
