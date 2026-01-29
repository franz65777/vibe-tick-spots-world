import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ExploreOverlayContextType {
  isExploreOverlayOpen: boolean;
  openExploreOverlay: () => void;
  closeExploreOverlay: () => void;
}

const ExploreOverlayContext = createContext<ExploreOverlayContextType | null>(null);

export const useExploreOverlay = () => {
  const context = useContext(ExploreOverlayContext);
  if (!context) {
    throw new Error('useExploreOverlay must be used within an ExploreOverlayProvider');
  }
  return context;
};

export const ExploreOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isExploreOverlayOpen, setIsExploreOverlayOpen] = useState(false);
  
  const originPathRef = useRef<string>('/');

  const openExploreOverlay = useCallback(() => {
    originPathRef.current = location.pathname;
    
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    
    setIsExploreOverlayOpen(true);
  }, [location.pathname, navigate]);

  const closeExploreOverlay = useCallback(() => {
    setIsExploreOverlayOpen(false);
    originPathRef.current = '/';
  }, []);

  useEffect(() => {
    const handleOpenExploreOverlay = () => {
      openExploreOverlay();
    };
    
    window.addEventListener('open-explore-overlay', handleOpenExploreOverlay);
    return () => window.removeEventListener('open-explore-overlay', handleOpenExploreOverlay);
  }, [openExploreOverlay]);

  return (
    <ExploreOverlayContext.Provider
      value={{
        isExploreOverlayOpen,
        openExploreOverlay,
        closeExploreOverlay,
      }}
    >
      {children}
    </ExploreOverlayContext.Provider>
  );
};
