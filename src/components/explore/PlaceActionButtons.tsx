import React, { useState } from 'react';
import { Phone, Globe, Navigation, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import PinShareModal from '@/components/explore/PinShareModal';

interface PlaceActionButtonsProps {
  place: any;
}

const PlaceActionButtons = ({ place }: PlaceActionButtonsProps) => {
  const [directionsModalOpen, setDirectionsModalOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const handleCall = () => {
    // In production, fetch phone number from Google Places API
    const phoneNumber = place.phone_number || '+1234567890';
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleWebsite = () => {
    // In production, fetch website from Google Places API
    const website = place.website || `https://www.google.com/search?q=${encodeURIComponent(place.name)}`;
    window.open(website, '_blank');
  };

  const handleDirections = (app: 'google' | 'apple' | 'waze') => {
    const { lat, lng } = place.coordinates;
    const encodedName = encodeURIComponent(place.name);

    let url = '';
    switch (app) {
      case 'google':
        url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${place.google_place_id || ''}`;
        break;
      case 'apple':
        url = `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodedName}`;
        break;
      case 'waze':
        url = `https://waze.com/ul?ll=${lat},${lng}&navigate=yes&q=${encodedName}`;
        break;
    }

    window.open(url, '_blank');
    setDirectionsModalOpen(false);
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleWebsite}
          className="flex-1 gap-2"
        >
          <Globe className="w-4 h-4" />
          Website
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleCall}
          className="flex-1 gap-2"
        >
          <Phone className="w-4 h-4" />
          Call
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setDirectionsModalOpen(true)}
          className="flex-1 gap-2"
        >
          <Navigation className="w-4 h-4" />
          Directions
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShareOpen(true)}
          className="flex-1 gap-2"
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>

      {/* Directions Modal */}
      <Dialog open={directionsModalOpen} onOpenChange={setDirectionsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Map App</DialogTitle>
            <DialogDescription>
              Select your preferred navigation app to get directions to {place.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 mt-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => handleDirections('google')}
            >
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Google Maps</div>
                <div className="text-xs text-muted-foreground">Navigate with Google Maps</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => handleDirections('apple')}
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Apple Maps</div>
                <div className="text-xs text-muted-foreground">Navigate with Apple Maps</div>
              </div>
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => handleDirections('waze')}
            >
              <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-cyan-600" />
              </div>
              <div className="text-left">
                <div className="font-semibold">Waze</div>
                <div className="text-xs text-muted-foreground">Navigate with Waze</div>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <PinShareModal isOpen={shareOpen} onClose={() => setShareOpen(false)} place={place} />
    </>
  );
};

// Add missing MapPin import
import { MapPin } from 'lucide-react';

export default PlaceActionButtons;
