
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Star, Heart, Share, MessageCircle, Navigation } from 'lucide-react';

interface Place {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  tags: string[];
  openingHours: string;
  coordinates: { lat: number; lng: number };
  likes: number;
  visitors: string[];
}

interface LocationDetailModalProps {
  place: Place;
  isOpen: boolean;
  onClose: () => void;
}

const LocationDetailModal = ({ place, isOpen, onClose }: LocationDetailModalProps) => {
  const handleViewOnMap = () => {
    // Open Google Maps with the location
    const url = `https://www.google.com/maps/search/?api=1&query=${place.coordinates.lat},${place.coordinates.lng}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="relative">
          <img 
            src={place.image} 
            alt={place.name}
            className="w-full h-48 object-cover"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">{place.name}</h2>
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium">{place.rating}</span>
                <span className="text-sm text-gray-500">({place.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-4">
            {place.tags.map((tag) => (
              <span
                key={tag}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">{place.openingHours}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handleViewOnMap}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Navigation className="w-4 h-4 mr-2" />
              View on Map
            </Button>
            
            <div className="grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" className="p-2">
                <Heart className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="p-2">
                <Share className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="outline" className="p-2">
                <MessageCircle className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationDetailModal;
