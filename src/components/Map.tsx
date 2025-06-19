
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
    <div className="relative w-full h-full min-h-[50vh] rounded-lg overflow-hidden bg-gradient-to-br from-blue-100 via-green-50 to-blue-50">
      {/* Google Maps not available notice */}
      <div className="absolute top-3 right-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 flex items-center gap-2 text-xs text-yellow-800 z-20 max-w-[200px]">
        <AlertCircle className="w-3 h-3 flex-shrink-0" />
        <span className="leading-tight">Demo Map - Google Maps integration needed</span>
      </div>

      {/* Map background with grid pattern to simulate map */}
      <div className="absolute inset-0 opacity-20">
        <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#4B5563" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Simulate roads/streets */}
          <path d="M0 150 Q100 120 200 140 T400 130" stroke="#6B7280" strokeWidth="2" fill="none" />
          <path d="M200 0 Q220 100 180 200 T160 300" stroke="#6B7280" strokeWidth="2" fill="none" />
          <path d="M0 80 Q150 70 300 90 T400 85" stroke="#6B7280" strokeWidth="1.5" fill="none" />
          
          {/* Simulate parks/green areas */}
          <circle cx="100" cy="80" r="25" fill="#10B981" opacity="0.3" />
          <circle cx="320" cy="200" r="30" fill="#10B981" opacity="0.3" />
          
          {/* Simulate water */}
          <path d="M350 250 Q370 260 390 250 Q380 270 350 275 Z" fill="#3B82F6" opacity="0.4" />
        </svg>
      </div>

      {/* Filter indicator */}
      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg text-sm font-medium capitalize shadow-sm z-10 border border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getPinColor().replace('text-', 'bg-')}`}></div>
          <span>{selectedFilter} ({locations.length})</span>
        </div>
      </div>

      {/* Location pins */}
      {locations.map((location, index) => {
        // Position pins in a more realistic pattern
        const positions = [
          { top: '25%', left: '30%' },
          { top: '45%', left: '60%' },
          { top: '65%', left: '25%' },
          { top: '35%', left: '75%' },
          { top: '55%', left: '45%' },
          { top: '20%', left: '70%' },
          { top: '70%', left: '50%' },
          { top: '40%', left: '20%' },
        ];
        
        const position = positions[index % positions.length];
        
        return (
          <div
            key={location.id}
            className="absolute cursor-pointer z-20 transition-transform hover:scale-110 group"
            style={{
              top: position.top,
              left: position.left,
              transform: 'translate(-50%, -100%)',
            }}
            onClick={() => onLocationClick(location)}
          >
            <div className="relative">
              <MapPin 
                className={`w-7 h-7 ${getPinColor()} drop-shadow-lg`}
                fill="currentColor"
              />
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md text-xs font-medium shadow-sm whitespace-nowrap max-w-28 truncate border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity">
                {location.name}
              </div>
            </div>
          </div>
        );
      })}

      {/* Map controls */}
      <div className="absolute bottom-4 right-3 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200">
        <button className="block p-2.5 border-b border-gray-200 hover:bg-gray-50 transition-colors">
          <span className="text-lg font-bold text-gray-700">+</span>
        </button>
        <button className="block p-2.5 hover:bg-gray-50 transition-colors">
          <span className="text-lg font-bold text-gray-700">−</span>
        </button>
      </div>

      {/* Map attribution */}
      <div className="absolute bottom-3 left-3 text-xs text-gray-500 bg-white/95 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-gray-200">
        Demo Map
      </div>
    </div>
  );
};

export default Map;
