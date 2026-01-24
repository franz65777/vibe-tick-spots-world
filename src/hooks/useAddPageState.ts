import { useState, useCallback, useMemo } from 'react';

interface TaggedUser {
  id: string;
  username: string;
  avatar_url?: string;
}

interface SelectedLocation {
  place_id: string;
  name: string;
  formatted_address?: string;
  address?: string;
  city?: string;
  category?: string;
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  types?: string[];
}

interface AddPageState {
  selectedFiles: File[];
  previewUrls: string[];
  caption: string;
  selectedLocation: SelectedLocation | null;
  selectedCategory: string;
  taggedUsers: TaggedUser[];
  rating: number | undefined;
  isUploading: boolean;
  businessLocation: any | null;
}

const initialState: AddPageState = {
  selectedFiles: [],
  previewUrls: [],
  caption: '',
  selectedLocation: null,
  selectedCategory: '',
  taggedUsers: [],
  rating: undefined,
  isUploading: false,
  businessLocation: null,
};

export const useAddPageState = () => {
  const [state, setState] = useState<AddPageState>(initialState);

  // Memoized setters to prevent re-renders
  const setSelectedFiles = useCallback((files: File[] | ((prev: File[]) => File[])) => {
    setState(prev => ({
      ...prev,
      selectedFiles: typeof files === 'function' ? files(prev.selectedFiles) : files,
    }));
  }, []);

  const setPreviewUrls = useCallback((urls: string[] | ((prev: string[]) => string[])) => {
    setState(prev => ({
      ...prev,
      previewUrls: typeof urls === 'function' ? urls(prev.previewUrls) : urls,
    }));
  }, []);

  const setCaption = useCallback((caption: string) => {
    setState(prev => ({ ...prev, caption }));
  }, []);

  const setSelectedLocation = useCallback((location: SelectedLocation | null) => {
    setState(prev => ({ ...prev, selectedLocation: location }));
  }, []);

  const setSelectedCategory = useCallback((category: string) => {
    setState(prev => ({ ...prev, selectedCategory: category }));
  }, []);

  const setTaggedUsers = useCallback((users: TaggedUser[] | ((prev: TaggedUser[]) => TaggedUser[])) => {
    setState(prev => ({
      ...prev,
      taggedUsers: typeof users === 'function' ? users(prev.taggedUsers) : users,
    }));
  }, []);

  const setRating = useCallback((rating: number | undefined) => {
    setState(prev => ({ ...prev, rating }));
  }, []);

  const setIsUploading = useCallback((uploading: boolean) => {
    setState(prev => ({ ...prev, isUploading: uploading }));
  }, []);

  const setBusinessLocation = useCallback((location: any | null) => {
    setState(prev => ({ ...prev, businessLocation: location }));
  }, []);

  // Batch update for files (prevents multiple re-renders)
  const addFiles = useCallback((newFiles: File[], newUrls: string[]) => {
    setState(prev => ({
      ...prev,
      selectedFiles: [...prev.selectedFiles, ...newFiles],
      previewUrls: [...prev.previewUrls, ...newUrls],
    }));
  }, []);

  const removeFile = useCallback((index: number) => {
    setState(prev => {
      // Revoke the URL to prevent memory leaks
      URL.revokeObjectURL(prev.previewUrls[index]);
      return {
        ...prev,
        selectedFiles: prev.selectedFiles.filter((_, i) => i !== index),
        previewUrls: prev.previewUrls.filter((_, i) => i !== index),
      };
    });
  }, []);

  // Reset state
  const resetState = useCallback(() => {
    setState(prev => {
      // Clean up all preview URLs
      prev.previewUrls.forEach(url => URL.revokeObjectURL(url));
      return initialState;
    });
  }, []);

  // Set location with category in single update
  const setLocationWithCategory = useCallback((location: SelectedLocation | null, category: string) => {
    setState(prev => ({
      ...prev,
      selectedLocation: location,
      selectedCategory: category,
    }));
  }, []);

  // Set business location with auto-selection
  const setBusinessLocationWithAutoSelect = useCallback((
    businessLoc: any,
    selectedLoc: SelectedLocation,
    category: string
  ) => {
    setState(prev => ({
      ...prev,
      businessLocation: businessLoc,
      selectedLocation: selectedLoc,
      selectedCategory: category,
    }));
  }, []);

  return {
    // State
    ...state,
    
    // Individual setters
    setSelectedFiles,
    setPreviewUrls,
    setCaption,
    setSelectedLocation,
    setSelectedCategory,
    setTaggedUsers,
    setRating,
    setIsUploading,
    setBusinessLocation,
    
    // Batch operations
    addFiles,
    removeFile,
    resetState,
    setLocationWithCategory,
    setBusinessLocationWithAutoSelect,
  };
};
