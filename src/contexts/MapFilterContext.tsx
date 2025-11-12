import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MapFilter = 'following' | 'popular' | 'recommended' | 'saved' | 'shared';

interface MapFilterContextType {
  activeFilter: MapFilter;
  setActiveFilter: (filter: MapFilter) => void;
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  toggleCategory: (categoryId: string) => void;
  clearCategories: () => void;
  selectedFollowedUserIds: string[];
  setSelectedFollowedUserIds: (userIds: string[]) => void;
  addFollowedUser: (userId: string) => void;
  removeFollowedUser: (userId: string) => void;
  clearFollowedUsers: () => void;
}

const MapFilterContext = createContext<MapFilterContextType | undefined>(undefined);

export const MapFilterProvider = ({ children }: { children: ReactNode }) => {
  const [activeFilter, setActiveFilter] = useState<MapFilter>('popular');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFollowedUserIds, setSelectedFollowedUserIds] = useState<string[]>([]);

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

  const addFollowedUser = (userId: string) => {
    setSelectedFollowedUserIds(prev => 
      prev.includes(userId) ? prev : [...prev, userId]
    );
  };

  const removeFollowedUser = (userId: string) => {
    setSelectedFollowedUserIds(prev => prev.filter(id => id !== userId));
  };

  const clearFollowedUsers = () => {
    setSelectedFollowedUserIds([]);
  };

  // Reset categories and followed users when filter changes
  const handleSetActiveFilter = (filter: MapFilter) => {
    setActiveFilter(filter);
    setSelectedCategories([]);
    if (filter !== 'following') {
      setSelectedFollowedUserIds([]);
    }
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
        selectedFollowedUserIds,
        setSelectedFollowedUserIds,
        addFollowedUser,
        removeFollowedUser,
        clearFollowedUsers,
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
