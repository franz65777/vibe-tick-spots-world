import React from 'react';
import hotel from '@/assets/category-hotel-transparent.png';
import cafe from '@/assets/category-cafe-transparent.png';
import bar from '@/assets/category-bar-transparent.png';
import restaurant from '@/assets/category-restaurant-transparent.png';
import entertainment from '@/assets/category-entertainment-transparent.png';
import bakery from '@/assets/category-bakery-transparent.png';
import museum from '@/assets/category-museum-transparent.png';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'w-12 h-12' }) => {
  const getCategoryImage = () => {
    const categoryLower = category.toLowerCase();

    switch (categoryLower) {
      case 'bakery':
        return { src: bakery, style: { objectFit: 'contain' } };
      case 'bar':
      case 'bar & pub':
        return { src: bar, style: { objectFit: 'contain' } };
      case 'museum':
        return { src: museum, style: { objectFit: 'contain' } };
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
        // Fallback to a neutral transparent icon (use restaurant as neutral) to avoid white backgrounds
        return { src: restaurant, style: { objectFit: 'contain' } };
    }
  };

  const { src, style } = getCategoryImage();

  return (
    <div className={`${className} flex items-center justify-center`}>
      <img
        src={src}
        alt={category}
        className="w-full h-full object-contain"
        style={style as any}
      />
    </div>
  );
};
