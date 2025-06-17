
import React from 'react';
import { MapPin, AlertCircle } from 'lucide-react';
import { Location } from '@/services/locationService';

interface MapProps {
  locations: Location[];
  selectedFilter: string;
  onLocationClick: (location: Location) => void;
}

const Map = ({ locations, selectedFilter, onLocationClick }: MapProps) => {
  const getPinColor = () => {
    switch (selectedFilter) {
      case 'following':
        return 'text-blue-500';
      case 'popular':
        return 'text-red-500';
      case 'new':
        return 'text-green-500';
      default:
        return 'text-red-500';
    }
  };

  return (
    <div className="rounded-lg overflow-hidden h-full relative min-h-96 bg-gradient-to-br from-blue-100 via-green-50 to-blue-50">
      {/* Google Maps configuration notice */}
      <div className="absolute top-4 right-4 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-yellow-800 z-20">
        <AlertCircle className="w-4 h-4" />
        <span>Google Maps API key needed for real map</span>
      </div>

      {/* Simulated map with enhanced styling */}
      <div className="absolute inset-0">
        <div 
          className="w-full h-full bg-cover bg-center"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='grid' width='20' height='20' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='%23e5e7eb' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)'/%3E%3C/svg%3E")`
          }}
        >
          {/* Simulated map features */}
          <svg className="w-full h-full opacity-30" viewBox="0 0 400 300">
            {/* Rivers/water */}
            <path d="M0 180 Q100 160 200 170 T400 165" stroke="#3B82F6" strokeWidth="8" fill="none" opacity="0.6" />
            
            {/* Parks */}
            <circle cx="80" cy="100" r="30" fill="#10B981" opacity="0.4" />
            <circle cx="320" cy="220" r="35" fill="#10B981" opacity="0.4" />
            
            {/* Buildings */}
            <rect x="150" y="120" width="20" height="25" fill="#6B7280" opacity="0.3" />
            <rect x="175" y="115" width="25" height="30" fill="#6B7280" opacity="0.3" />
            <rect x="205" y="125" width="18" height="20" fill="#6B7280" opacity="0.3" />
          </svg>
        </div>
      </div>

      {/* Filter indicator */}
      <div className="absolute top-4 left-4 bg-white px-3 py-1 rounded-full text-sm font-medium capitalize shadow-md z-10 border">
        {selectedFilter} ({locations.length})
      </div>

      {/* Location pins with improved positioning */}
      {locations.map((location, index) => {
        const positions = [
          { top: '20%', left: '25%' },
          { top: '40%', left: '65%' },
          { top: '60%', left: '30%' },
          { top: '30%', left: '80%' },
          { top: '70%', left: '50%' },
          { top: '45%', left: '15%' },
          { top: '25%', left: '75%' },
          { top: '65%', left: '70%' },
        ];
        
        const position = positions[index % positions.length];
        
        return (
          <div
            key={location.id}
            className="absolute cursor-pointer z-20 transition-all duration-200 hover:scale-125 hover:z-30"
            style={{
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -100%)',
            }}
            onClick={() => onLocationClick(location)}
          >
            <div className="relative group">
              <MapPin 
                className={`w-8 h-8 ${getPinColor()} drop-shadow-lg filter`}
                fill="currentColor"
              />
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white px-2 py-1 rounded-md text-xs font-medium shadow-lg whitespace-nowrap max-w-32 truncate opacity-0 group-hover:opacity-100 transition-opacity duration-200 border">
                {location.name}
              </div>
            </div>
          </div>
        );
      })}

      {/* Enhanced map controls */}
      <div className="absolute bottom-16 right-4 bg-white rounded-lg shadow-lg border">
        <button className="block p-3 border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <span className="text-lg font-bold text-gray-700">+</span>
        </button>
        <button className="block p-3 hover:bg-gray-50 transition-colors">
          <span className="text-lg font-bold text-gray-700">−</span>
        </button>
      </div>

      {/* Map attribution */}
      <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white px-2 py-1 rounded shadow-sm border">
        Demo Map - Configure Google Maps API for full functionality
      </div>
    </div>
  );
};

export default Map;
