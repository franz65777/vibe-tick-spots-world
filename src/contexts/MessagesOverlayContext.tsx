import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface MessagesOverlayContextType {
  isMessagesOverlayOpen: boolean;
  openMessagesOverlay: (initialUserId?: string, fromProfileId?: string) => void;
  closeMessagesOverlay: () => void;
  initialUserId: string | null;
  fromProfileId: string | null;
  clearInitialUserId: () => void;
}

const MessagesOverlayContext = createContext<MessagesOverlayContextType | null>(null);

export const useMessagesOverlay = () => {
  const context = useContext(MessagesOverlayContext);
  if (!context) {
    throw new Error('useMessagesOverlay must be used within a MessagesOverlayProvider');
  }
  return context;
};

export const MessagesOverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isMessagesOverlayOpen, setIsMessagesOverlayOpen] = useState(false);
  const [initialUserId, setInitialUserId] = useState<string | null>(null);
  const [fromProfileId, setFromProfileId] = useState<string | null>(null);
  
  // Track origin path for navigation after close
  const originPathRef = useRef<string>('/');

  const openMessagesOverlay = useCallback((userId?: string, profileId?: string) => {
    // Store the current path before opening
    originPathRef.current = location.pathname;
    
    // Set initial user if provided (for direct chat navigation)
    if (userId) {
      setInitialUserId(userId);
    }
    if (profileId) {
      setFromProfileId(profileId);
    }
    
    // Navigate to home first if not already there (loads home in background)
    if (location.pathname !== '/') {
      navigate('/', { replace: true });
    }
    
    setIsMessagesOverlayOpen(true);
  }, [location.pathname, navigate]);

  const closeMessagesOverlay = useCallback(() => {
    setIsMessagesOverlayOpen(false);
    setInitialUserId(null);
    setFromProfileId(null);
    // Already on home (navigated in openMessagesOverlay), just reset origin
    originPathRef.current = '/';
  }, []);

  const clearInitialUserId = useCallback(() => {
    setInitialUserId(null);
    setFromProfileId(null);
  }, []);

  // Listen for open-messages-overlay event from bottom navigation
  useEffect(() => {
    const handleOpenMessagesOverlay = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string; fromProfileId?: string }>;
      openMessagesOverlay(customEvent.detail?.userId, customEvent.detail?.fromProfileId);
    };
    
    window.addEventListener('open-messages-overlay', handleOpenMessagesOverlay);
    return () => window.removeEventListener('open-messages-overlay', handleOpenMessagesOverlay);
  }, [openMessagesOverlay]);

  return (
    <MessagesOverlayContext.Provider
      value={{
        isMessagesOverlayOpen,
        openMessagesOverlay,
        closeMessagesOverlay,
        initialUserId,
        fromProfileId,
        clearInitialUserId,
      }}
    >
      {children}
    </MessagesOverlayContext.Provider>
  );
};
