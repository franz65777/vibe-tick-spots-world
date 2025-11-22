import React, { createContext, useContext, useState, ReactNode } from 'react';

export type MapFilter = 'following' | 'popular' | 'recommended' | 'saved' | 'shared';
export type SaveTagFilter = 'general' | 'date_night' | 'birthday' | 'night_out' | 'family';

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
  selectedSaveTags: SaveTagFilter[];
  setSelectedSaveTags: (tags: SaveTagFilter[]) => void;
  toggleSaveTag: (tag: SaveTagFilter) => void;
  clearSaveTags: () => void;
  filtersVisible: boolean;
  setFiltersVisible: (visible: boolean) => void;
}

const MapFilterContext = createContext<MapFilterContextType | undefined>(undefined);

export const MapFilterProvider = ({ children }: { children: ReactNode }) => {
  const [activeFilter, setActiveFilter] = useState<MapFilter>('popular');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedFollowedUserIds, setSelectedFollowedUserIds] = useState<string[]>([]);
  const [selectedSaveTags, setSelectedSaveTags] = useState<SaveTagFilter[]>([]);
  const [filtersVisible, setFiltersVisible] = useState<boolean>(true);

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

  const toggleSaveTag = (tag: SaveTagFilter) => {
    setSelectedSaveTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const clearSaveTags = () => {
    setSelectedSaveTags([]);
  };

  // Reset categories, followed users, and save tags when filter changes
  const handleSetActiveFilter = (filter: MapFilter) => {
    setActiveFilter(filter);
    setSelectedCategories([]);
    setSelectedSaveTags([]);
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
        selectedSaveTags,
        setSelectedSaveTags,
        toggleSaveTag,
        clearSaveTags,
        filtersVisible,
        setFiltersVisible,
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
