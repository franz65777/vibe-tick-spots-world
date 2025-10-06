import React, { useState } from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import GooglePlacesAutocomplete from '@/components/GooglePlacesAutocomplete';
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
          <GooglePlacesAutocomplete
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
          {!selectedCategory ? (
            <div className="p-4 bg-primary/10 rounded-xl space-y-3">
              <div>
                <p className="font-semibold text-foreground">{selectedLocation.name}</p>
                <p className="text-sm text-muted-foreground">{selectedLocation.formatted_address}</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Place Category <span className="text-destructive">*</span>
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => onCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  required
                >
                  <option value="">Select category...</option>
                  {allowedCategories.map(category => (
                    <option key={category} value={category}>
                      {categoryDisplayNames[category]}
                    </option>
                  ))}
                </select>
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
          ) : (
            <div className="p-4 bg-primary/10 rounded-xl space-y-2">
              <div>
                <p className="font-semibold text-foreground">{selectedLocation.name}</p>
                <p className="text-sm text-muted-foreground">{selectedLocation.formatted_address}</p>
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
          )}
        </div>
      )}
    </div>
  );
};
