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
  sizeMultiplier?: number;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ category, className = 'w-12 h-12', sizeMultiplier = 1 }) => {
  const getCategoryImage = () => {
    const categoryLower = category.toLowerCase();

    switch (categoryLower) {
      case 'bakery':
        return { src: bakery, scale: 0.75 };
      case 'bar':
      case 'bar & pub':
        return { src: bar, scale: 0.75 };
      case 'museum':
        return { src: museum, scale: 0.75 };
      case 'hotel':
        return { src: hotel, scale: 1.08 };
      case 'cafe':
      case 'café':
        return { src: cafe, scale: 0.75 };
      case 'restaurant':
        return { src: restaurant, scale: 1.26 };
      case 'entertainment':
        return { src: entertainment, scale: 0.75 };
      default:
        // Fallback to a neutral transparent icon (use restaurant as neutral) to avoid white backgrounds
        return { src: restaurant, scale: 1.1 };
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
          transform: `scale(${scale * sizeMultiplier})`
        }}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );
};
