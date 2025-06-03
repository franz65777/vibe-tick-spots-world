
import { MapPin, Calendar, Users, Heart, Bookmark, Plus, Eye } from 'lucide-react';
import { useState } from 'react';
import TripDetailModal from './TripDetailModal';

interface Trip {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  cities: string[];
  coverImage: string;
  totalPlaces: number;
  likes: number;
  saves: number;
  visibility: 'public' | 'friends' | 'private';
  categories: {
    restaurants: number;
    bars: number;
    museums: number;
    hotels: number;
    shops: number;
    experiences: number;
  };
  tags: string[];
}

const TripsGrid = () => {
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Demo trips - in real app this would come from props or hook
  const trips: Trip[] = [
    {
      id: '1',
      name: 'Rome Food & Culture Adventure',
      description: 'A perfect blend of authentic Roman cuisine and historic landmarks',
      startDate: '2024-05-15',
      endDate: '2024-05-18',
      cities: ['Rome', 'Vatican City'],
      coverImage: 'https://images.unsplash.com/photo-1531572753322-ad063cecc140?w=400&h=300&fit=crop',
      totalPlaces: 12,
      likes: 45,
      saves: 23,
      visibility: 'public',
      categories: {
        restaurants: 5,
        bars: 2,
        museums: 3,
        hotels: 1,
        shops: 1,
        experiences: 0
      },
      tags: ['foodie', 'culture', 'historic']
    },
    {
      id: '2',
      name: 'Paris Weekend Getaway',
      description: 'Romantic weekend exploring Parisian cafés and iconic sights',
      startDate: '2024-06-01',
      endDate: '2024-06-03',
      cities: ['Paris'],
      coverImage: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400&h=300&fit=crop',
      totalPlaces: 8,
      likes: 32,
      saves: 18,
      visibility: 'friends',
      categories: {
        restaurants: 3,
        bars: 1,
        museums: 2,
        hotels: 1,
        shops: 1,
        experiences: 0
      },
      tags: ['romantic', 'weekend', 'culture']
    },
    {
      id: '3',
      name: 'Tokyo Foodie Expedition',
      description: 'From street food to Michelin stars - the ultimate Tokyo food journey',
      startDate: '2024-04-20',
      endDate: '2024-04-25',
      cities: ['Tokyo'],
      coverImage: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=300&fit=crop',
      totalPlaces: 15,
      likes: 67,
      saves: 41,
      visibility: 'public',
      categories: {
        restaurants: 8,
        bars: 3,
        museums: 1,
        hotels: 1,
        shops: 2,
        experiences: 0
      },
      tags: ['foodie', 'authentic', 'luxury']
    }
  ];

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Eye className="w-3 h-3" />;
      case 'friends':
        return <Users className="w-3 h-3" />;
      default:
        return <MapPin className="w-3 h-3" />;
    }
  };

  const getTopCategories = (categories: Trip['categories']) => {
    return Object.entries(categories)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category, count]) => ({
        name: category,
        count,
        emoji: {
          restaurants: '🍽️',
          bars: '🍷',
          museums: '🏛️',
          hotels: '🏨',
          shops: '🛍️',
          experiences: '🎯'
        }[category] || '📍'
      }));
  };

  if (trips.length === 0) {
    return (
      <div className="px-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No trips yet</h3>
          <p className="text-gray-600 text-sm mb-4">Create your first trip to organize your saved places</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors">
            <Plus className="w-4 h-4" />
            Create Trip
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Create Trip Button */}
      <div className="mb-4">
        <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-sm">
          <Plus className="w-4 h-4" />
          Create New Trip
        </button>
      </div>

      <div className="space-y-4">
        {trips.map((trip) => {
          const topCategories = getTopCategories(trip.categories);
          
          return (
            <div
              key={trip.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer hover:scale-[1.02] border border-gray-100"
              onClick={() => handleTripClick(trip)}
            >
              {/* Cover Image */}
              <div className="relative h-32 overflow-hidden">
                <img
                  src={trip.coverImage}
                  alt={trip.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                
                {/* Trip duration and visibility */}
                <div className="absolute top-2 left-2 flex gap-2">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-medium text-gray-800">
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </span>
                  </div>
                </div>

                <div className="absolute top-2 right-2">
                  <div className="bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
                    {getVisibilityIcon(trip.visibility)}
                    <span className="text-xs font-medium text-gray-800 capitalize">
                      {trip.visibility}
                    </span>
                  </div>
                </div>

                {/* Cities */}
                <div className="absolute bottom-2 left-2">
                  <div className="bg-black/70 backdrop-blur-sm rounded-full px-3 py-1">
                    <span className="text-xs font-medium text-white">
                      {trip.cities.join(', ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="mb-3">
                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1">{trip.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{trip.description}</p>
                </div>

                {/* Categories */}
                <div className="flex items-center gap-2 mb-3">
                  {topCategories.map((category, index) => (
                    <div key={index} className="bg-gray-100 rounded-full px-2 py-1 flex items-center gap-1">
                      <span className="text-xs">{category.emoji}</span>
                      <span className="text-xs font-medium text-gray-700">{category.count}</span>
                    </div>
                  ))}
                  {trip.totalPlaces > topCategories.reduce((sum, cat) => sum + cat.count, 0) && (
                    <div className="bg-gray-100 rounded-full px-2 py-1">
                      <span className="text-xs font-medium text-gray-500">
                        +{trip.totalPlaces - topCategories.reduce((sum, cat) => sum + cat.count, 0)} more
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span className="text-xs font-medium">{trip.totalPlaces} places</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Heart className="w-3 h-3 text-red-500" />
                      <span className="text-xs font-medium text-gray-700">{trip.likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-purple-500" />
                      <span className="text-xs font-medium text-gray-700">{trip.saves}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {trip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {trip.tags.slice(0, 3).map((tag, index) => (
                      <span 
                        key={index}
                        className="bg-blue-50 text-blue-600 text-xs px-2 py-1 rounded-full font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <TripDetailModal 
        trip={selectedTrip}
        isOpen={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
      />
    </div>
  );
};

export default TripsGrid;
