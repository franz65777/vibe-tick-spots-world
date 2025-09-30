import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MapFilter = 'following' | 'popular' | 'saved';

interface MapFilterContextType {
  activeFilter: MapFilter;
  setActiveFilter: (filter: MapFilter) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  toggleCategory: (categoryId: string) => void;
  clearCategories: () => void;
}

const MapFilterContext = createContext<MapFilterContextType | undefined>(undefined);

export const MapFilterProvider = ({ children }: { children: ReactNode }) => {
  const [activeFilter, setActiveFilter] = useState<MapFilter>('popular');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const clearCategories = () => {
    setSelectedCategories([]);
  };

  // Reset categories when filter changes
  const handleSetActiveFilter = (filter: MapFilter) => {
    setActiveFilter(filter);
    setSelectedCategories([]);
  };

  return (
    <MapFilterContext.Provider
      value={{
        activeFilter,
        setActiveFilter: handleSetActiveFilter,
        selectedCategories,
        setSelectedCategories,
        toggleCategory,
        clearCategories,
      }}
    >
      {children}
    </MapFilterContext.Provider>
  );
};

export const useMapFilter = () => {
  const context = useContext(MapFilterContext);
  if (context === undefined) {
    throw new Error('useMapFilter must be used within a MapFilterProvider');
  }
  return context;
};
