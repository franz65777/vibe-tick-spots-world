
import React, { useState } from 'react';
import { Filter, Coffee, Utensils, Hotel, TreePine, ShoppingBag, Camera, MapPin, X } from 'lucide-react';

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
}

const CategoryFilter = ({ selectedCategories, onCategoryChange }: CategoryFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const categories = [
    { key: 'cafe', label: 'Cafés', icon: Coffee, color: 'bg-amber-100 text-amber-700' },
    { key: 'restaurant', label: 'Restaurants', icon: Utensils, color: 'bg-red-100 text-red-700' },
    { key: 'hotel', label: 'Hotels', icon: Hotel, color: 'bg-blue-100 text-blue-700' },
    { key: 'park', label: 'Parks', icon: TreePine, color: 'bg-green-100 text-green-700' },
    { key: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'bg-purple-100 text-purple-700' },
    { key: 'attraction', label: 'Attractions', icon: Camera, color: 'bg-pink-100 text-pink-700' },
    { key: 'bar', label: 'Bars', icon: MapPin, color: 'bg-orange-100 text-orange-700' },
  ];

  const handleCategoryToggle = (categoryKey: string) => {
    const newCategories = selectedCategories.includes(categoryKey)
      ? selectedCategories.filter(cat => cat !== categoryKey)
      : [...selectedCategories, categoryKey];
    
    onCategoryChange(newCategories);
  };

  const clearAllCategories = () => {
    onCategoryChange([]);
  };

  const selectedCount = selectedCategories.length;

  return (
    <div className="relative">
      {/* Filter Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm
          transition-all duration-200 border-2
          ${selectedCount > 0 
            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
          }
        `}
      >
        <Filter className="w-4 h-4" />
        <span>Categories</span>
        {selectedCount > 0 && (
          <span className="bg-white text-blue-600 px-2 py-0.5 rounded-full text-xs font-bold">
            {selectedCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Filter by Category</h3>
              {selectedCount > 0 && (
                <button
                  onClick={clearAllCategories}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Categories */}
            <div className="p-2 max-h-64 overflow-y-auto">
              {categories.map((category) => {
                const IconComponent = category.icon;
                const isSelected = selectedCategories.includes(category.key);
                
                return (
                  <button
                    key={category.key}
                    onClick={() => handleCategoryToggle(category.key)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200
                      ${isSelected 
                        ? 'bg-blue-50 border-2 border-blue-200' 
                        : 'hover:bg-gray-50 border-2 border-transparent'
                      }
                    `}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${category.color}`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-gray-900">{category.label}</span>
                    {isSelected && (
                      <div className="ml-auto w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryFilter;
