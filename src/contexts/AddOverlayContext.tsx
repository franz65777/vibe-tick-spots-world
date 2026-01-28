import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface SelectedLocation {
  id?: string;
  name: string;
  google_place_id?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
}

interface AddOverlayContextType {
  isAddOverlayOpen: boolean;
  openAddOverlay: () => void;
  closeAddOverlay: () => void;
  addContributionLocation: SelectedLocation | null;
  setAddContributionLocation: (loc: SelectedLocation | null) => void;
  isAddContributionModalOpen: boolean;
  setIsAddContributionModalOpen: (open: boolean) => void;
}

const AddOverlayContext = createContext<AddOverlayContextType | null>(null);

export const useAddOverlay = () => {
  const context = useContext(AddOverlayContext);
  if (!context) {
    throw new Error('useAddOverlay must be used within an AddOverlayProvider');
  }
  return context;
};

export const AddOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isAddOverlayOpen, setIsAddOverlayOpen] = useState(false);
  const [addContributionLocation, setAddContributionLocation] = useState<SelectedLocation | null>(null);
  const [isAddContributionModalOpen, setIsAddContributionModalOpen] = useState(false);
  
  // Track origin path for navigation after close
  const originPathRef = useRef<string>('/');

  const openAddOverlay = useCallback(() => {
    // Store the current path before opening
    originPathRef.current = location.pathname;
    setIsAddOverlayOpen(true);
  }, [location.pathname]);

  const closeAddOverlay = useCallback(() => {
    setIsAddOverlayOpen(false);
    
    // If opened from a page other than home, navigate to home
    if (originPathRef.current !== '/') {
      navigate('/', { replace: true });
    }
    
    // Reset origin
    originPathRef.current = '/';
  }, [navigate]);

  // Listen for open-add-overlay event from bottom navigation
  useEffect(() => {
    const handleOpenAddOverlay = () => {
      openAddOverlay();
    };
    
    window.addEventListener('open-add-overlay', handleOpenAddOverlay);
    return () => window.removeEventListener('open-add-overlay', handleOpenAddOverlay);
  }, [openAddOverlay]);

  // Handle closing contribution modal
  const handleCloseContributionModal = useCallback(() => {
    setIsAddContributionModalOpen(false);
    setAddContributionLocation(null);
    
    // If opened from a page other than home, navigate to home
    if (originPathRef.current !== '/') {
      navigate('/', { replace: true });
    }
    
    // Reset origin
    originPathRef.current = '/';
  }, [navigate]);

  return (
    <AddOverlayContext.Provider
      value={{
        isAddOverlayOpen,
        openAddOverlay,
        closeAddOverlay,
        addContributionLocation,
        setAddContributionLocation,
        isAddContributionModalOpen,
        setIsAddContributionModalOpen: (open) => {
          if (!open) {
            handleCloseContributionModal();
          } else {
            setIsAddContributionModalOpen(true);
          }
        },
      }}
    >
      {children}
    </AddOverlayContext.Provider>
  );
};
