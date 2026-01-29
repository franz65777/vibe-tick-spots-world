import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface LeaderboardOverlayContextType {
  isLeaderboardOverlayOpen: boolean;
  openLeaderboardOverlay: () => void;
  closeLeaderboardOverlay: () => void;
}

const LeaderboardOverlayContext = createContext<LeaderboardOverlayContextType | null>(null);

export const useLeaderboardOverlay = () => {
  const context = useContext(LeaderboardOverlayContext);
  if (!context) {
    throw new Error('useLeaderboardOverlay must be used within a LeaderboardOverlayProvider');
  }
  return context;
};

export const LeaderboardOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isLeaderboardOverlayOpen, setIsLeaderboardOverlayOpen] = useState(false);
  
  const originPathRef = useRef<string>('/');

  const openLeaderboardOverlay = useCallback(() => {
    originPathRef.current = location.pathname;
    
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    
    setIsLeaderboardOverlayOpen(true);
  }, [location.pathname, navigate]);

  const closeLeaderboardOverlay = useCallback(() => {
    setIsLeaderboardOverlayOpen(false);
    originPathRef.current = '/';
  }, []);

  useEffect(() => {
    const handleOpenLeaderboardOverlay = () => {
      openLeaderboardOverlay();
    };
    
    window.addEventListener('open-leaderboard-overlay', handleOpenLeaderboardOverlay);
    return () => window.removeEventListener('open-leaderboard-overlay', handleOpenLeaderboardOverlay);
  }, [openLeaderboardOverlay]);

  return (
    <LeaderboardOverlayContext.Provider
      value={{
        isLeaderboardOverlayOpen,
        openLeaderboardOverlay,
        closeLeaderboardOverlay,
      }}
    >
      {children}
    </LeaderboardOverlayContext.Provider>
  );
};
