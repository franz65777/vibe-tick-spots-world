
import { Search, MapPin, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const ExplorePage = () => {
  const categories = [
    { name: 'Restaurants', image: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png', color: 'from-orange-400 to-red-500' },
    { name: 'Hotels', image: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png', color: 'from-blue-400 to-cyan-500' },
    { name: 'Bars', image: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png', color: 'from-purple-400 to-pink-500' },
    { name: 'Museums', image: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png', color: 'from-gray-400 to-gray-600' },
    { name: 'Experiences', image: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png', color: 'from-green-400 to-teal-500' },
    { name: 'Shops', image: '/lovable-uploads/5bb15f7b-b3ba-4eae-88b1-7fa789eb67c4.png', color: 'from-yellow-400 to-orange-500' },
  ];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input 
              placeholder="Search for places" 
              className="pl-10 bg-gray-50 border-0 rounded-xl h-12"
            />
          </div>
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
            <User className="w-6 h-6 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="flex-1 p-4">
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category, index) => (
            <div key={index} className="relative overflow-hidden rounded-2xl h-32 group cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${category.color} opacity-80`}></div>
              <div className="absolute inset-0 bg-black bg-opacity-30"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <h3 className="text-white text-lg font-semibold text-center px-4">
                  {category.name}
                </h3>
              </div>
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-200"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExplorePage;
