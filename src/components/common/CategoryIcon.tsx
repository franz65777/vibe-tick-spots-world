import React from 'react';
import hotel from '@/assets/category-hotel-3d-new.png';
import cafe from '@/assets/category-cafe-3d-new.png';
import bar from '@/assets/category-bar-3d-new.png';
import restaurant from '@/assets/category-restaurant-3d-new.png';
import entertainment from '@/assets/category-entertainment-3d-new.png';
import bakery from '@/assets/category-bakery-3d-new.png';
import museum from '@/assets/category-museum-3d-new.png';

interface CategoryIconProps {
  category: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'w-12 h-12' }) => {
  const getCategoryImage = () => {
    const categoryLower = category.toLowerCase();

    switch (categoryLower) {
      case 'bakery':
        return { src: bakery, scale: 1 };
      case 'bar':
      case 'bar & pub':
        return { src: bar, scale: 1 };
      case 'museum':
        return { src: museum, scale: 1 };
      case 'hotel':
        return { src: hotel, scale: 1.2 };
      case 'cafe':
      case 'café':
        return { src: cafe, scale: 1 };
      case 'restaurant':
        return { src: restaurant, scale: 1.4 };
      case 'entertainment':
        return { src: entertainment, scale: 1 };
      default:
        // Fallback to a neutral transparent icon (use restaurant as neutral) to avoid white backgrounds
        return { src: restaurant, scale: 1.4 };
    }
  };

  const { src, scale } = getCategoryImage();

  return (
    <div className={`${className} flex items-center justify-center`}>
      <img
        src={src}
        alt={category}
        className="w-full h-full object-contain"
        style={{ 
          objectFit: 'contain',
          transform: `scale(${scale})`
        }}
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
};
