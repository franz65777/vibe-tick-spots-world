import { MapPin, Calendar, Users, Heart, Bookmark, Plus, Eye } from 'lucide-react';
import { useState } from 'react';
import TripDetailModal from './TripDetailModal';
import CreateTripModal from './CreateTripModal';
import ShareModal from '../home/ShareModal';

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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [tripToShare, setTripToShare] = useState<Trip | null>(null);
  const [userTrips, setUserTrips] = useState<Trip[]>([
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
  ]);

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip);
  };

  const handleCreateTrip = (tripData: any) => {
    setUserTrips(prev => [tripData, ...prev]);
    console.log('Trip created:', tripData);
  };

  const handleShareTrip = (trip: Trip) => {
    setTripToShare(trip);
    setShowShareModal(true);
  };

  const handleShare = (friendIds: string[], trip: Trip) => {
    console.log('Sharing trip:', trip.name, 'with friends:', friendIds);
    // Here you would implement the actual sharing logic
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

  if (userTrips.length === 0) {
    return (
      <div className="px-4">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Create Your First Trip</h3>
          <p className="text-gray-600 text-sm mb-6 max-w-xs">Turn your saved places into organized travel guides to share with friends</p>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <Plus className="w-5 h-5" />
            Create Trip
          </button>
        </div>

        <CreateTripModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateTrip={handleCreateTrip}
        />
      </div>
    );
  }

  return (
    <div className="px-4">
      {/* Create Trip Button */}
      <div className="mb-6">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <Plus className="w-5 h-5" />
          Create New Trip
        </button>
      </div>

      <div className="space-y-6">
        {userTrips.map((trip) => {
          const topCategories = getTopCategories(trip.categories);
          
          return (
            <div
              key={trip.id}
              className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer hover:scale-[1.02] border border-gray-100 group"
              onClick={() => handleTripClick(trip)}
            >
              {/* Cover Image */}
              <div className="relative h-40 overflow-hidden">
                <img
                  src={trip.coverImage}
                  alt={trip.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                
                {/* Trip duration and visibility */}
                <div className="absolute top-3 left-3 flex gap-2">
                  <div className="bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-800">
                      {formatDateRange(trip.startDate, trip.endDate)}
                    </span>
                  </div>
                </div>

                <div className="absolute top-3 right-3">
                  <div className="bg-white/95 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 shadow-lg">
                    {getVisibilityIcon(trip.visibility)}
                    <span className="text-xs font-semibold text-gray-800 capitalize">
                      {trip.visibility}
                    </span>
                  </div>
                </div>

                {/* Cities */}
                <div className="absolute bottom-3 left-3">
                  <div className="bg-black/80 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
                    <span className="text-sm font-semibold text-white">
                      {trip.cities.join(', ')}
                    </span>
                  </div>
                </div>

                {/* Share button */}
                <div className="absolute bottom-3 right-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShareTrip(trip);
                    }}
                    className="bg-white/95 backdrop-blur-md rounded-full p-2 shadow-lg hover:bg-white transition-all duration-200 hover:scale-110"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-1">{trip.name}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">{trip.description}</p>
                </div>

                {/* Categories */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {topCategories.map((category, index) => (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-full px-3 py-1.5 flex items-center gap-1.5">
                      <span className="text-sm">{category.emoji}</span>
                      <span className="text-xs font-semibold text-gray-700">{category.count}</span>
                    </div>
                  ))}
                  {trip.totalPlaces > topCategories.reduce((sum, cat) => sum + cat.count, 0) && (
                    <div className="bg-gray-100 rounded-full px-3 py-1.5">
                      <span className="text-xs font-medium text-gray-500">
                        +{trip.totalPlaces - topCategories.reduce((sum, cat) => sum + cat.count, 0)} more
                      </span>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">{trip.totalPlaces} places</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm font-semibold text-gray-700">{trip.likes}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Bookmark className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-semibold text-gray-700">{trip.saves}</span>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {trip.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {trip.tags.slice(0, 3).map((tag, index) => (
                      <span 
                        key={index}
                        className="bg-blue-50 text-blue-600 text-xs px-3 py-1 rounded-full font-medium border border-blue-200"
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

      <CreateTripModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTrip={handleCreateTrip}
      />

      <ShareModal 
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        item={tripToShare}
        itemType="trip"
        onShare={handleShare}
      />
    </div>
  );
};

export default TripsGrid;
