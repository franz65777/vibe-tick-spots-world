
import { MapPin } from 'lucide-react';

interface Place {
  id: string;
  name: string;
  category: string;
  coordinates: { lat: number; lng: number };
  visitors: string[];
  rating?: number;
  price?: string;
}

interface MapSectionProps {
  places: Place[];
  onPinClick: (place: Place) => void;
}

const MapSection = ({ places, onPinClick }: MapSectionProps) => {
  return (
    <div className="px-4 pb-4 bg-white">
      <div className="h-64 bg-gradient-to-br from-green-50 to-blue-50 rounded-2xl relative overflow-hidden shadow-lg">
        {/* Map Background with Google Maps Style */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-100 via-green-50 to-blue-200">
          {/* Street lines */}
          <svg className="absolute inset-0 w-full h-full">
            <defs>
              <pattern id="streets" patternUnits="userSpaceOnUse" width="40" height="40">
                <path d="M0,20 L40,20" stroke="#ddd" strokeWidth="1"/>
                <path d="M20,0 L20,40" stroke="#ddd" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#streets)" opacity="0.3"/>
          </svg>
        </div>

        {/* Location Labels */}
        <div className="absolute top-4 left-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
          PACIFIC HEIGHTS
        </div>
        <div className="absolute top-6 right-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
          CHINATOWN
        </div>
        <div className="absolute bottom-16 left-4 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
          MISSION<br />DISTRICT
        </div>
        <div className="absolute bottom-20 right-8 text-xs font-medium text-gray-600 bg-white/80 px-2 py-1 rounded">
          UNION SQUARE
        </div>

        {/* Place Pins with visitor info */}
        {places.map((place, index) => (
          <div 
            key={place.id}
            className="absolute group cursor-pointer"
            style={{
              top: `${30 + index * 15}%`,
              left: `${25 + index * 20}%`
            }}
            onClick={() => onPinClick(place)}
          >
            {/* Pin */}
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white hover:scale-110 transition-transform">
              <div className="w-3 h-3 bg-white rounded-full"></div>
            </div>
            
            {/* Hover Info Card */}
            <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              <div className="text-sm font-semibold text-gray-900">{place.name}</div>
              <div className="text-xs text-gray-500 mb-1">{place.category} • {place.price}</div>
              <div className="text-xs text-gray-600">
                Visited by: {place.visitors.join(', ')}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs text-yellow-500">★</span>
                <span className="text-xs text-gray-600">{place.rating}</span>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
            </div>
          </div>
        ))}

        {/* Current Location Indicator */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
        </div>

        {/* Expand Map Button */}
        <button className="absolute bottom-4 right-4 w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors">
          <div className="grid grid-cols-2 gap-0.5">
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
          </div>
        </button>
      </div>
    </div>
  );
};

export default MapSection;
