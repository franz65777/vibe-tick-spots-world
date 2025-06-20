
import React from 'react';
import { Utensils, Coffee, Building, ShoppingBag, GraduationCap, Music, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';

type CategoryType = 'all' | 'restaurant' | 'bar' | 'cafe' | 'shop' | 'museum' | 'other';

interface CategoryFilterProps {
  selectedCategory: CategoryType;
  onCategoryChange: (category: CategoryType) => void;
}

const categories = [
  { id: 'all' as CategoryType, label: 'All', icon: MapPin },
  { id: 'restaurant' as CategoryType, label: 'Restaurant', icon: Utensils },
  { id: 'bar' as CategoryType, label: 'Bar', icon: Music },
  { id: 'cafe' as CategoryType, label: 'Café', icon: Coffee },
  { id: 'shop' as CategoryType, label: 'Shop', icon: ShoppingBag },
  { id: 'museum' as CategoryType, label: 'Museum', icon: GraduationCap },
  { id: 'other' as CategoryType, label: 'Other', icon: Building },
];

const CategoryFilter = ({ selectedCategory, onCategoryChange }: CategoryFilterProps) => {
  return (
    <div className="bg-white/80 backdrop-blur-sm px-4 py-3 border-b border-gray-100">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => onCategoryChange(category.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
                selectedCategory === category.id
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-500/30"
                  : "bg-white/90 text-gray-600 hover:bg-white hover:shadow-md"
              )}
            >
              <Icon className="w-4 h-4" />
              {category.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryFilter;
export type { CategoryType };
