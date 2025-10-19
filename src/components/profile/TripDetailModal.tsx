import { X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Trip } from '@/hooks/useTrips';

interface TripDetailModalProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
}

const TripDetailModal = ({ trip, isOpen, onClose }: TripDetailModalProps) => {
  if (!isOpen || !trip) return null;

  const locations = trip.trip_locations || [];
  const coverImage = trip.cover_image_url || locations[0]?.locations?.image_url || 
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&h=600&fit=crop';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-white rounded-t-3xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">{trip.name}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Cover Image */}
        <div className="relative h-64">
          <img 
            src={coverImage} 
            alt={trip.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {/* Details */}
          <div className="space-y-4">
            {trip.description && (
              <p className="text-muted-foreground leading-relaxed">{trip.description}</p>
            )}

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{trip.city}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-sm font-medium">{locations.length} locations</span>
              </div>
            </div>
          </div>

          {/* Locations */}
          {locations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Locations</h3>
              <div className="space-y-2">
                {locations.map((tripLocation: any) => {
                  const location = tripLocation.locations;
                  if (!location) return null;

                  return (
                    <div
                      key={tripLocation.id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                    >
                      {location.image_url && (
                        <img 
                          src={location.image_url} 
                          alt={location.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{location.name}</h4>
                        <p className="text-sm text-muted-foreground truncate">
                          {location.category} • {location.city}
                        </p>
                        {tripLocation.notes && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {tripLocation.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDetailModal;
