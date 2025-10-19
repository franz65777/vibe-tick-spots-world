import React from 'react';
import {
  Hotel,
  Coffee,
  Beer,
  UtensilsCrossed,
  Music,
  Cake,
  Building2,
  MapPin
} from 'lucide-react';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'w-12 h-12' }) => {
  const getCategoryIcon = () => {
    const categoryLower = category.toLowerCase();

    switch (categoryLower) {
      case 'bakery':
        return { Icon: Cake, color: 'text-amber-600 bg-amber-50' };
      case 'bar':
      case 'bar & pub':
        return { Icon: Beer, color: 'text-orange-600 bg-orange-50' };
      case 'museum':
        return { Icon: Building2, color: 'text-purple-600 bg-purple-50' };
      case 'hotel':
        return { Icon: Hotel, color: 'text-blue-600 bg-blue-50' };
      case 'cafe':
      case 'café':
        return { Icon: Coffee, color: 'text-brown-600 bg-amber-50' };
      case 'restaurant':
        return { Icon: UtensilsCrossed, color: 'text-red-600 bg-red-50' };
      case 'entertainment':
        return { Icon: Music, color: 'text-pink-600 bg-pink-50' };
      default:
        return { Icon: MapPin, color: 'text-gray-600 bg-gray-50' };
    }
  };

  const { Icon, color } = getCategoryIcon();

  return (
    <div className={`${className} rounded-xl ${color} flex items-center justify-center p-2`}>
      <Icon className="w-full h-full" />
    </div>
  );
};
