import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface FeedOverlayContextType {
  isFeedOverlayOpen: boolean;
  openFeedOverlay: () => void;
  closeFeedOverlay: () => void;
}

const FeedOverlayContext = createContext<FeedOverlayContextType | null>(null);

export const useFeedOverlay = () => {
  const context = useContext(FeedOverlayContext);
  if (!context) {
    throw new Error('useFeedOverlay must be used within a FeedOverlayProvider');
  }
  return context;
};

export const FeedOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isFeedOverlayOpen, setIsFeedOverlayOpen] = useState(false);
  
  const originPathRef = useRef<string>('/');

  const openFeedOverlay = useCallback(() => {
    originPathRef.current = location.pathname;
    
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    
    setIsFeedOverlayOpen(true);
  }, [location.pathname, navigate]);

  const closeFeedOverlay = useCallback(() => {
    setIsFeedOverlayOpen(false);
    originPathRef.current = '/';
  }, []);

  useEffect(() => {
    const handleOpenFeedOverlay = () => {
      openFeedOverlay();
    };
    
    window.addEventListener('open-feed-overlay', handleOpenFeedOverlay);
    return () => window.removeEventListener('open-feed-overlay', handleOpenFeedOverlay);
  }, [openFeedOverlay]);

  return (
    <FeedOverlayContext.Provider
      value={{
        isFeedOverlayOpen,
        openFeedOverlay,
        closeFeedOverlay,
      }}
    >
      {children}
    </FeedOverlayContext.Provider>
  );
};
