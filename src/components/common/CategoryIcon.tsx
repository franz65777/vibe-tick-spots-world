import React from 'react';
import bakeryBarMuseum from '@/assets/category-bakery-bar-museum.png';
import hotelCafe from '@/assets/category-hotel-cafe.png';
import restaurant from '@/assets/category-restaurant.png';
import entertainment from '@/assets/category-entertainment.png';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'w-12 h-12' }) => {
  const getCategoryImage = () => {
    const categoryLower = category.toLowerCase();
    
    switch (categoryLower) {
      case 'bakery':
        return { src: bakeryBarMuseum, style: { objectFit: 'cover', objectPosition: '0% 50%', transform: 'scale(1.5)', width: '33.33%', marginLeft: '0%' } };
      case 'bar':
      case 'bar & pub':
        return { src: bakeryBarMuseum, style: { objectFit: 'cover', objectPosition: '50% 50%', transform: 'scale(1.5)', width: '33.33%', marginLeft: '-33.33%' } };
      case 'museum':
        return { src: bakeryBarMuseum, style: { objectFit: 'cover', objectPosition: '100% 50%', transform: 'scale(1.5)', width: '33.33%', marginLeft: '-66.66%' } };
      case 'hotel':
        return { src: hotelCafe, style: { objectFit: 'cover', objectPosition: '0% 50%', transform: 'scale(2)', width: '50%', marginLeft: '0%' } };
      case 'cafe':
      case 'café':
        return { src: hotelCafe, style: { objectFit: 'cover', objectPosition: '100% 50%', transform: 'scale(2)', width: '50%', marginLeft: '-50%' } };
      case 'restaurant':
        return { src: restaurant, style: { objectFit: 'contain' } };
      case 'entertainment':
        return { src: entertainment, style: { objectFit: 'contain' } };
      default:
        return { src: restaurant, style: { objectFit: 'contain' } };
    }
  };

  const { src, style } = getCategoryImage();

  return (
    <div className={`${className} rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-sm`}>
      <img 
        src={src} 
        alt={category}
        className="w-full h-full"
        style={style as any}
      />
    </div>
  );
};
