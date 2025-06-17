
import React, { useState } from 'react';
import { Calendar, MapPin, Grid3X3, Plus } from 'lucide-react';
import { useUserTrips } from '@/hooks/useUserTrips';
import { useProfile } from '@/hooks/useProfile';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import CreateTripModal from './CreateTripModal';

const TripsGrid = () => {
  const { userId } = useParams<{ userId: string }>();
  const { profile } = useProfile();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Use userId from params if viewing another user's profile, otherwise use current user's profile
  const targetUserId = userId || profile?.id;
  const { trips, loading } = useUserTrips(targetUserId);
  
  // Check if this is the current user's profile
  const isOwnProfile = !userId || userId === profile?.id;

  const handleCreateTrip = (tripData: any) => {
    console.log('Creating trip:', tripData);
    // TODO: Implement actual trip creation
    setIsCreateModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="px-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Grid3X3 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips yet</h3>
          <p className="text-gray-600 text-sm mb-4">
            {isOwnProfile ? 'Start planning your travel adventures!' : 'No trips to show'}
          </p>
          {isOwnProfile && (
            <Button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Trip
            </Button>
          )}
        </div>

        <CreateTripModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={handleCreateTrip}
        />
      </div>
    );
  }

  return (
    <div className="px-4">
      {isOwnProfile && (
        <div className="mb-4">
          <Button 
            onClick={() => setIsCreateModalOpen(true)} 
            className="w-full flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create New Trip
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0">
                {trip.image_url ? (
                  <img 
                    src={trip.image_url} 
                    alt={trip.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-gray-400" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1 truncate">{trip.name}</h3>
                {trip.description && (
                  <p className="text-gray-600 text-sm mb-2 line-clamp-2">{trip.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      {new Date(trip.start_date).toLocaleDateString()} - {new Date(trip.end_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span>{trip.locations.length} locations</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateTrip}
      />
    </div>
  );
};

export default TripsGrid;
