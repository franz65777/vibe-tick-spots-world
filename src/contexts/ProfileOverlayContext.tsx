import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface ProfileOverlayContextType {
  isProfileOverlayOpen: boolean;
  openProfileOverlay: () => void;
  closeProfileOverlay: () => void;
}

const ProfileOverlayContext = createContext<ProfileOverlayContextType | null>(null);

export const useProfileOverlay = () => {
  const context = useContext(ProfileOverlayContext);
  if (!context) {
    throw new Error('useProfileOverlay must be used within a ProfileOverlayProvider');
  }
  return context;
};

export const ProfileOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isProfileOverlayOpen, setIsProfileOverlayOpen] = useState(false);
  
  const originPathRef = useRef<string>('/');

  const openProfileOverlay = useCallback(() => {
    originPathRef.current = location.pathname;
    
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    
    setIsProfileOverlayOpen(true);
  }, [location.pathname, navigate]);

  const closeProfileOverlay = useCallback(() => {
    setIsProfileOverlayOpen(false);
    originPathRef.current = '/';
  }, []);

  useEffect(() => {
    const handleOpenProfileOverlay = () => {
      openProfileOverlay();
    };
    
    window.addEventListener('open-profile-overlay', handleOpenProfileOverlay);
    return () => window.removeEventListener('open-profile-overlay', handleOpenProfileOverlay);
  }, [openProfileOverlay]);

  return (
    <ProfileOverlayContext.Provider
      value={{
        isProfileOverlayOpen,
        openProfileOverlay,
        closeProfileOverlay,
      }}
    >
      {children}
    </ProfileOverlayContext.Provider>
  );
};
