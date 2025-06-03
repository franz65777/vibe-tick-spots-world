
import { MapPin, Calendar, Users } from 'lucide-react';

const TripsGrid = () => {
  return (
    <div className="px-4">
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <MapPin className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Trips coming soon!</h3>
        <p className="text-gray-600 text-sm">Plan and share your travel adventures</p>
      </div>
    </div>
  );
};

export default TripsGrid;
