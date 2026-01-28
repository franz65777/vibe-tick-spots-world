import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface NotificationsOverlayContextType {
  isNotificationsOverlayOpen: boolean;
  openNotificationsOverlay: () => void;
  closeNotificationsOverlay: () => void;
}

const NotificationsOverlayContext = createContext<NotificationsOverlayContextType | null>(null);

export const useNotificationsOverlay = () => {
  const context = useContext(NotificationsOverlayContext);
  if (!context) {
    throw new Error('useNotificationsOverlay must be used within a NotificationsOverlayProvider');
  }
  return context;
};

export const NotificationsOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isNotificationsOverlayOpen, setIsNotificationsOverlayOpen] = useState(false);
  
  // Track origin path for navigation after close
  const originPathRef = useRef<string>('/');

  const openNotificationsOverlay = useCallback(() => {
    // Store the current path before opening
    originPathRef.current = location.pathname;
    
    // Navigate to home first if not already there (loads home in background)
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    
    setIsNotificationsOverlayOpen(true);
  }, [location.pathname, navigate]);

  const closeNotificationsOverlay = useCallback(() => {
    setIsNotificationsOverlayOpen(false);
    // Already on home (navigated in openNotificationsOverlay), just reset origin
    originPathRef.current = '/';
  }, []);

  // Listen for open-notifications-overlay event from bottom navigation
  useEffect(() => {
    const handleOpenNotificationsOverlay = () => {
      openNotificationsOverlay();
    };
    
    window.addEventListener('open-notifications-overlay', handleOpenNotificationsOverlay);
    return () => window.removeEventListener('open-notifications-overlay', handleOpenNotificationsOverlay);
  }, [openNotificationsOverlay]);

  return (
    <NotificationsOverlayContext.Provider
      value={{
        isNotificationsOverlayOpen,
        openNotificationsOverlay,
        closeNotificationsOverlay,
      }}
    >
      {children}
    </NotificationsOverlayContext.Provider>
  );
};
