
import { useState } from 'react';
import { X, Plus, MapPin, Calendar, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSavedPlaces } from '@/hooks/useSavedPlaces';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTrip: (tripData: any) => void;
}

interface Place {
  id: string;
  name: string;
  category: string;
  city: string;
  image?: string;
}

const CreateTripModal = ({ isOpen, onClose, onCreateTrip }: CreateTripModalProps) => {
  const [step, setStep] = useState(1);
  const [tripName, setTripName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const { savedPlaces } = useSavedPlaces();

  // Get all places from saved places
  const allPlaces: Place[] = Object.entries(savedPlaces).flatMap(([city, places]) =>
    places.map(place => ({
      id: place.id,
      name: place.name,
      category: place.category,
      city: city,
      image: `https://images.unsplash.com/photo-${Math.random().toString().substring(2, 15)}?w=300&h=200&fit=crop`
    }))
  );

  // Get available cities
  const cities = Object.keys(savedPlaces);

  // Filter places based on search and selected city
  const filteredPlaces = allPlaces.filter(place => {
    const matchesSearch = place.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = !selectedCity || place.city === selectedCity;
    return matchesSearch && matchesCity;
  });

  // Smart suggestions based on city and recent activity
  const getSmartSuggestions = () => {
    if (selectedCity) {
      return allPlaces.filter(place => place.city === selectedCity).slice(0, 6);
    }
    return allPlaces.slice(0, 6);
  };

  const handlePlaceToggle = (placeId: string) => {
    setSelectedPlaces(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(placeId)) {
        newSelected.delete(placeId);
      } else {
        newSelected.add(placeId);
      }
      return newSelected;
    });
  };

  const handleCreateTrip = () => {
    const selectedPlacesList = allPlaces.filter(place => selectedPlaces.has(place.id));
    
    const tripData = {
      id: Date.now().toString(),
      name: tripName,
      description,
      startDate,
      endDate,
      cities: selectedCity ? [selectedCity] : [...new Set(selectedPlacesList.map(p => p.city))],
      coverImage: selectedPlacesList[0]?.image || 'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=300&fit=crop',
      totalPlaces: selectedPlaces.size,
      likes: 0,
      saves: 0,
      visibility: 'public' as const,
      categories: selectedPlacesList.reduce((acc, place) => {
        acc[place.category] = (acc[place.category] || 0) + 1;
        return acc;
      }, {} as any),
      tags: [],
      places: selectedPlacesList
    };

    onCreateTrip(tripData);
    handleClose();
  };

  const handleClose = () => {
    setStep(1);
    setTripName('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setSelectedCity('');
    setSelectedPlaces(new Set());
    setSearchQuery('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">Create New Trip</h2>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-4 py-2 border-b border-gray-100">
          <div className="flex items-center justify-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>1</div>
            <div className={`w-16 h-1 rounded ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
            }`}>2</div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trip Name</label>
                <Input
                  value={tripName}
                  onChange={(e) => setTripName(e.target.value)}
                  placeholder="e.g., Rome Food & Culture Adventure"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us about your trip..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none h-20 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">City (Optional)</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All cities</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Add Places to Your Trip</h3>
                <p className="text-sm text-gray-600 mb-3">Select from your saved places</p>
                
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search places..."
                    className="pl-10"
                  />
                </div>
              </div>

              {!searchQuery && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Smart Suggestions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {getSmartSuggestions().map(place => (
                      <div
                        key={place.id}
                        onClick={() => handlePlaceToggle(place.id)}
                        className={`p-2 rounded-lg border cursor-pointer transition-all ${
                          selectedPlaces.has(place.id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">{place.name}</p>
                            <p className="text-xs text-gray-500">{place.category}</p>
                          </div>
                          {selectedPlaces.has(place.id) && (
                            <Check className="w-4 h-4 text-blue-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {filteredPlaces.map(place => (
                  <div
                    key={place.id}
                    onClick={() => handlePlaceToggle(place.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                      selectedPlaces.has(place.id)
                        ? 'bg-blue-50 border border-blue-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{place.name}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <span className="capitalize">{place.category}</span>
                        <span>•</span>
                        <span>{place.city}</span>
                      </div>
                    </div>
                    {selectedPlaces.has(place.id) && (
                      <Check className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                ))}
              </div>

              {filteredPlaces.length === 0 && (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No places found</p>
                  <p className="text-gray-400 text-xs">Try adjusting your search or city filter</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex gap-3">
            {step === 2 && (
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                Back
              </Button>
            )}
            {step === 1 && (
              <Button
                onClick={() => setStep(2)}
                disabled={!tripName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Next
              </Button>
            )}
            {step === 2 && (
              <Button
                onClick={handleCreateTrip}
                disabled={selectedPlaces.size === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                Create Trip ({selectedPlaces.size} places)
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateTripModal;
