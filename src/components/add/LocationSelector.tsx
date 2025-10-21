import React, { useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import OpenStreetMapAutocomplete from '@/components/OpenStreetMapAutocomplete';
// Category selection removed per latest UX

interface LocationSelectorProps {
  selectedLocation: any;
  onLocationSelect: (location: any) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedLocation,
  onLocationSelect,
  selectedCategory,
  onCategoryChange
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <MapPin className="w-5 h-5 text-destructive" />
        <h3 className="font-semibold">Add Location</h3>
        <span className="text-xs text-destructive">*Required</span>
      </div>

      {!selectedLocation ? (
        <div className="space-y-3">
          <OpenStreetMapAutocomplete
            onPlaceSelect={onLocationSelect}
            placeholder="Search for a place..."
            className="w-full"
          />
          <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              You must tag a location to share your post. This helps others discover great places!
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-primary/10 rounded-xl space-y-2">
            <div>
              <p className="font-semibold text-foreground">{selectedLocation.name}</p>
              <p className="text-sm text-muted-foreground">{selectedLocation.formatted_address || selectedLocation.address}</p>
            </div>
            <button
              onClick={() => {
                onLocationSelect(null);
                onCategoryChange('');
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Change location
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
