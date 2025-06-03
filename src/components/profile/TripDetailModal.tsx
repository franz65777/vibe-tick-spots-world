
import { X, MapPin, Calendar, Heart, Bookmark, Share, Users, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useState } from 'react';

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

interface Place {
  id: string;
  name: string;
  category: string;
  image: string;
  rating: number;
  notes?: string;
  visitDate?: string;
}

interface TripDetailModalProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
}

const TripDetailModal = ({ trip, isOpen, onClose }: TripDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<'category' | 'timeline' | 'map'>('category');
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Demo places for the trip
  const demoPlaces: Place[] = [
    {
      id: '1',
      name: 'Da Enzo al 29',
      category: 'restaurants',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=300&h=200&fit=crop',
      rating: 5,
      notes: 'Best carbonara in Rome!',
      visitDate: '2024-05-15'
    },
    {
      id: '2',
      name: 'Vatican Museums',
      category: 'museums',
      image: 'https://images.unsplash.com/photo-1539650116574-75c0c6d73c6e?w=300&h=200&fit=crop',
      rating: 5,
      notes: 'Book tickets in advance',
      visitDate: '2024-05-16'
    },
    {
      id: '3',
      name: 'Freni e Frizioni',
      category: 'bars',
      image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=300&h=200&fit=crop',
      rating: 4,
      notes: 'Great aperitivo spot',
      visitDate: '2024-05-17'
    }
  ];

  if (!isOpen || !trip) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: { [key: string]: string } = {
      restaurants: '🍽️',
      bars: '🍷',
      museums: '🏛️',
      hotels: '🏨',
      shops: '🛍️',
      experiences: '🎯'
    };
    return emojis[category] || '📍';
  };

  const getVisibilityIcon = (visibility: string) => {
    switch (visibility) {
      case 'public':
        return <Eye className="w-4 h-4" />;
      case 'friends':
        return <Users className="w-4 h-4" />;
      default:
        return <MapPin className="w-4 h-4" />;
    }
  };

  const renderPlacesByCategory = () => {
    const categorizedPlaces = demoPlaces.reduce((acc, place) => {
      if (!acc[place.category]) acc[place.category] = [];
      acc[place.category].push(place);
      return acc;
    }, {} as { [key: string]: Place[] });

    return (
      <div className="space-y-4">
        {Object.entries(categorizedPlaces).map(([category, places]) => (
          <div key={category} className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-800 capitalize">
              <span className="text-lg">{getCategoryEmoji(category)}</span>
              {category.replace('_', ' ')} ({places.length})
            </h4>
            <div className="space-y-2">
              {places.map((place) => (
                <div key={place.id} className="bg-gray-50 rounded-xl p-3 flex gap-3">
                  <img 
                    src={place.image} 
                    alt={place.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-sm text-gray-900 truncate">{place.name}</h5>
                    <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <span 
                          key={i} 
                          className={`text-xs ${i < place.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        >
                          ⭐
                        </span>
                      ))}
                    </div>
                    {place.notes && (
                      <p className="text-xs text-gray-600 line-clamp-2">{place.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="relative">
          <img 
            src={trip.coverImage} 
            alt={trip.name}
            className="w-full h-48 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
          
          {/* Close button */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white backdrop-blur-sm"
          >
            <X className="w-4 h-4" />
          </Button>

          {/* Trip info overlay */}
          <div className="absolute bottom-3 left-3 right-3">
            <h2 className="text-white font-bold text-lg mb-1 line-clamp-2">{trip.name}</h2>
            <div className="flex items-center gap-2 text-white/90 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(trip.startDate)} - {formatDate(trip.endDate)}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{trip.cities.join(', ')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Description and stats */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" />
                <AvatarFallback>YU</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm">your_username</p>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  {getVisibilityIcon(trip.visibility)}
                  <span className="capitalize">{trip.visibility}</span>
                </div>
              </div>
            </div>
            
            <p className="text-sm text-gray-700 mb-3">{trip.description}</p>
            
            {/* Action buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsLiked(!isLiked)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isLiked 
                      ? 'bg-red-50 text-red-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                  }`}
                >
                  <Heart className={`w-3 h-3 ${isLiked ? 'fill-current' : ''}`} />
                  <span>{trip.likes + (isLiked ? 1 : 0)}</span>
                </button>
                <button
                  onClick={() => setIsSaved(!isSaved)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isSaved 
                      ? 'bg-purple-50 text-purple-600' 
                      : 'bg-gray-100 text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  <Bookmark className={`w-3 h-3 ${isSaved ? 'fill-current' : ''}`} />
                  <span>{trip.saves + (isSaved ? 1 : 0)}</span>
                </button>
              </div>
              <button className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-all">
                <Share className="w-3 h-3" />
                <span>Share</span>
              </button>
            </div>
          </div>

          {/* Trip stats */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900">{trip.totalPlaces}</div>
                <div className="text-xs text-gray-600">Places</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1}
                </div>
                <div className="text-xs text-gray-600">Days</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">{trip.cities.length}</div>
                <div className="text-xs text-gray-600">Cities</div>
              </div>
            </div>
          </div>

          {/* Tab navigation */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('category')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'category'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'timeline'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Timeline
              </button>
            </div>
          </div>

          {/* Content based on active tab */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'category' && renderPlacesByCategory()}
            {activeTab === 'timeline' && (
              <div className="text-center py-8">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Calendar className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Timeline View</h4>
                <p className="text-sm text-gray-600">Coming soon! View places organized by day.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailModal;
