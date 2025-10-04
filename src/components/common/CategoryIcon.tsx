import React from 'react';
import bakeryBarMuseum from '@/assets/category-bakery-bar-museum.png';
import hotel from '@/assets/category-hotel-transparent.png';
import cafe from '@/assets/category-cafe-transparent.png';
import bar from '@/assets/category-bar-transparent.png';
import restaurant from '@/assets/category-restaurant-transparent.png';
import entertainment from '@/assets/category-entertainment-transparent.png';

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
        return { src: bar, style: { objectFit: 'contain' } };
      case 'museum':
        return { src: bakeryBarMuseum, style: { objectFit: 'cover', objectPosition: '100% 50%', transform: 'scale(1.5)', width: '33.33%', marginLeft: '-66.66%' } };
      case 'hotel':
        return { src: hotel, style: { objectFit: 'contain' } };
      case 'cafe':
      case 'café':
        return { src: cafe, style: { objectFit: 'contain' } };
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
    <div className={`${className} rounded-xl overflow-hidden flex items-center justify-center`}>
      <img 
        src={src} 
        alt={category}
        className="w-full h-full"
        style={style as any}
      />
    </div>
  );
};
