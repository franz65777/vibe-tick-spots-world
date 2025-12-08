import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UIStateContextType {
  isShareProfileOpen: boolean;
  setIsShareProfileOpen: (open: boolean) => void;
}

const UIStateContext = createContext<UIStateContextType | undefined>(undefined);

export const UIStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isShareProfileOpen, setIsShareProfileOpen] = useState(false);

  return (
    <UIStateContext.Provider value={{ isShareProfileOpen, setIsShareProfileOpen }}>
      {children}
    </UIStateContext.Provider>
  );
};

export const useUIState = () => {
  const context = useContext(UIStateContext);
  if (!context) {
    throw new Error('useUIState must be used within a UIStateProvider');
  }
  return context;
};
