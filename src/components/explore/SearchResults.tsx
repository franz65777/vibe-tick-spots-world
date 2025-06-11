
import React from 'react';
import { Heart, Bookmark, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Place {
  id: string;
  name: string;
  category: string;
  likes: number;
  friendsWhoSaved: { name: string; avatar: string; }[];
  visitors: string[];
  isNew: boolean;
  coordinates: { lat: number; lng: number };
  rating: number;
  reviews: number;
  distance: string;
  addedBy: { name: string; avatar: string; isFollowing: boolean };
  addedDate: string;
  image: string;
  description?: string;
  totalSaves: number;
}

interface SearchResultsProps {
  results: Place[];
  isLoading: boolean;
  onPlaceClick: (place: Place) => void;
  onSavePlace: (placeId: string) => void;
}

const SearchResults = ({ results, isLoading, onPlaceClick, onSavePlace }: SearchResultsProps) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Searching amazing places...</p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">🔍</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No places found</h3>
        <p className="text-gray-600">Try adjusting your search or filters to find what you're looking for.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {results.length} place{results.length !== 1 ? 's' : ''} found
        </h2>
      </div>
      
      <div className="space-y-4">
        {results.map((place) => (
          <div 
            key={place.id}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="relative">
              <img 
                src={place.image} 
                alt={place.name}
                className="w-full h-48 object-cover"
              />
              <div className="absolute top-3 right-3">
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-white/90 backdrop-blur-sm hover:bg-white"
                  onClick={() => onSavePlace(place.id)}
                >
                  <Bookmark className="w-4 h-4" />
                </Button>
              </div>
              {place.isNew && (
                <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  New
                </div>
              )}
            </div>
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-lg">{place.name}</h3>
                  <p className="text-gray-600 text-sm">{place.category} • {place.distance}</p>
                </div>
              </div>
              
              {place.description && (
                <p className="text-gray-600 text-sm mb-3">{place.description}</p>
              )}
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span>{place.rating}</span>
                    <span>({place.reviews})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{place.totalSaves} saves</span>
                  </div>
                </div>
                
                <Button
                  size="sm"
                  onClick={() => onPlaceClick(place)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  View Details
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SearchResults;
