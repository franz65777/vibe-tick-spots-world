import React, { createContext, useContext, useState, ReactNode } from 'react';

interface OnboardingContextType {
  isOnboardingActive: boolean;
  setIsOnboardingActive: (active: boolean) => void;
  currentOnboardingStep: string | null;
  setCurrentOnboardingStep: (step: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState<string | null>(null);

  return (
    <OnboardingContext.Provider value={{ 
      isOnboardingActive, 
      setIsOnboardingActive,
      currentOnboardingStep,
      setCurrentOnboardingStep
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};
