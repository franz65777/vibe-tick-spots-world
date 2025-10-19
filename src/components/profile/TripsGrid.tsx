import { MapPin, Eye, Sparkles, Plus } from 'lucide-react';
import { useState } from 'react';
import TripDetailModal from './TripDetailModal';
import CreateTripModal from './CreateTripModal';
import { AiAssistantModal } from '../ai/AiAssistantModal';
import { useTrips } from '@/hooks/useTrips';
import { Skeleton } from '@/components/ui/skeleton';

const TripsGrid = () => {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const { trips, isLoading, createTrip } = useTrips();

  const selectedTrip = trips.find(t => t.id === selectedTripId) || null;

  const handleTripClick = (tripId: string) => {
    setSelectedTripId(tripId);
  };

  const handleCreateTrip = async (tripData: any) => {
    await createTrip(tripData);
    setShowCreateModal(false);
  };

  const getVisibilityIcon = (isPublic: boolean) => {
    return isPublic ? <Eye className="w-3 h-3" /> : <MapPin className="w-3 h-3" />;
  };

  if (isLoading) {
    return (
      <div className="px-4 space-y-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100">
            <Skeleton className="h-40 w-full" />
            <div className="p-5 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <>
        <div className="px-4">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
              <MapPin className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-2">Create Your First Trip</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs">
              Turn your saved places into organized travel guides
            </p>
            
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button 
                onClick={() => setIsAiModalOpen(true)}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5" />
                Plan with AI Assistant
              </button>
              
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="w-5 h-5" />
                Create Trip Manually
              </button>
            </div>
          </div>

          <CreateTripModal 
            isOpen={showCreateModal}
            onClose={() => setShowCreateModal(false)}
            onCreateTrip={handleCreateTrip}
          />
          
          <AiAssistantModal 
            isOpen={isAiModalOpen}
            onClose={() => setIsAiModalOpen(false)}
          />
        </div>
      </>
    );
  }

  return (
    <div className="px-4">
      {/* Action Buttons */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <button 
          onClick={() => setIsAiModalOpen(true)}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-pink-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Sparkles className="w-5 h-5" />
          AI Assistant
        </button>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" />
          Create Trip
        </button>
      </div>

      <div className="space-y-6">
        {trips.map((trip) => {
          const totalPlaces = trip.trip_locations?.length || 0;
          const coverImage = trip.cover_image_url || trip.trip_locations?.[0]?.locations?.image_url || 
            'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=400&h=300&fit=crop';
          
          return (
            <div
              key={trip.id}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer hover:scale-[1.02] border border-border group"
              onClick={() => handleTripClick(trip.id)}
            >
              {/* Cover Image */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={coverImage}
                  alt={trip.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
              {/* Visibility badge */}
              <div className="absolute top-3 left-3">
                <div className="bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                  {getVisibilityIcon(trip.is_public)}
                  <span className="text-xs font-semibold capitalize">
                    {trip.is_public ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>

                {/* City */}
                <div className="absolute bottom-3 left-3">
                  <div className="bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                    <span className="text-sm font-semibold text-white">
                      {trip.city}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-lg mb-2 line-clamp-1">{trip.name}</h3>
                  {trip.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {trip.description}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">{totalPlaces} places</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <TripDetailModal 
        trip={selectedTrip}
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTripId(null)}
      />

      <CreateTripModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTrip={handleCreateTrip}
      />
      
      <AiAssistantModal 
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
};

export default TripsGrid;
