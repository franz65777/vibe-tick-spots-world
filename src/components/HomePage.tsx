import { useState } from 'react';
import { MapPin, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Place {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  isSaved: boolean;
}

const mockPlaces: Place[] = [
  {
    id: '1',
    name: 'The Cozy Corner Café',
    category: 'cafe',
    imageUrl: 'https://source.unsplash.com/400x300/?cafe',
    rating: 4.5,
    reviewCount: 120,
    isSaved: true,
  },
  {
    id: '2',
    name: 'Sunset View Restaurant',
    category: 'restaurant',
    imageUrl: 'https://source.unsplash.com/400x300/?restaurant',
    rating: 4.2,
    reviewCount: 85,
    isSaved: false,
  },
  {
    id: '3',
    name: 'City Center Hotel',
    category: 'hotel',
    imageUrl: 'https://source.unsplash.com/400x300/?hotel',
    rating: 4.8,
    reviewCount: 210,
    isSaved: true,
  },
];

const PlaceCard = ({ place }: { place: Place }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <img src={place.imageUrl} alt={place.name} className="w-full h-40 object-cover" />
      <div className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{place.name}</h3>
            <p className="text-sm text-gray-500">{place.category}</p>
          </div>
          <button className="text-gray-500 hover:text-red-600 transition-colors">
            <Heart className={cn("w-5 h-5", place.isSaved ? "text-red-500" : "")} />
          </button>
        </div>
        <div className="flex items-center mt-2">
          <span className="text-sm text-gray-700 font-medium">{place.rating}</span>
          <span className="text-sm text-gray-500 ml-1">({place.reviewCount} reviews)</span>
        </div>
      </div>
    </div>
  );
};

const HomePage = () => {
  console.log('HomePage rendering...');
  
  const [selectedCategory, setSelectedCategory] = useState('all');

  const handleCategoryClick = (category: string) => {
    console.log('Category clicked:', category);
    setSelectedCategory(category);
  };

  const filteredPlaces = selectedCategory === 'all'
    ? mockPlaces
    : mockPlaces.filter(place => place.category === selectedCategory);

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 py-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
        <p className="text-gray-500 mt-1">Explore new places and share your experiences</p>
      </div>

      {/* Map Section */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
          Map Placeholder
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="bg-white px-4 py-3 border-b border-gray-200">
        <div className="flex space-x-2 overflow-x-auto">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('all')}
          >
            All
          </Button>
          <Button
            variant={selectedCategory === 'restaurant' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('restaurant')}
          >
            Restaurants
          </Button>
          <Button
            variant={selectedCategory === 'hotel' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('hotel')}
          >
            Hotels
          </Button>
          <Button
            variant={selectedCategory === 'cafe' ? 'default' : 'outline'}
            onClick={() => handleCategoryClick('cafe')}
          >
            Cafes
          </Button>
        </div>
      </div>

      {/* Stories Section */}
      <div className="bg-white px-4 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Today's Stories</h2>
        <div className="flex space-x-4 overflow-x-auto mt-2">
          <div className="w-24 h-24 rounded-full bg-gray-200"></div>
          <div className="w-24 h-24 rounded-full bg-gray-200"></div>
          <div className="w-24 h-24 rounded-full bg-gray-200"></div>
        </div>
      </div>

      {/* Places Section */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white">
          <div className="px-4 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {selectedCategory === 'all' 
                ? 'Nearby Places' 
                : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}s Nearby`
              }
            </h2>
          </div>
          <div className="px-4 py-2 space-y-3">
            {filteredPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
