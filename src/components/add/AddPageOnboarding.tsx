import React, { useState, useCallback } from 'react';
import { Camera, MapPin, Share2, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface AddPageOnboardingProps {
  onComplete: () => void;
}

const steps = [
  { 
    icon: Camera, 
    titleKey: 'onboardingStep1Title',
    descKey: 'onboardingStep1Desc',
    color: 'bg-blue-500'
  },
  { 
    icon: MapPin, 
    titleKey: 'onboardingStep2Title',
    descKey: 'onboardingStep2Desc',
    color: 'bg-green-500'
  },
  { 
    icon: Share2, 
    titleKey: 'onboardingStep3Title',
    descKey: 'onboardingStep3Desc',
    color: 'bg-purple-500'
  }
];

export const AddPageOnboarding: React.FC<AddPageOnboardingProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  }, [currentStep]);

  const handleComplete = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-end justify-center p-4 pb-8 transition-opacity duration-300 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleComplete}
      />
      
      {/* Tooltip Card */}
      <div 
        className={`relative w-full max-w-sm bg-card rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
          isExiting ? 'translate-y-8 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleComplete}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/80 hover:bg-muted flex items-center justify-center transition-colors z-10"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl ${currentStepData.color} flex items-center justify-center mb-4 shadow-lg`}>
            <Icon className="w-7 h-7 text-white" />
          </div>

          {/* Step counter */}
          <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            {t('step', { ns: 'add' })} {currentStep + 1} / {steps.length}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold text-foreground mb-2">
            {t(currentStepData.titleKey, { ns: 'add' })}
          </h3>

          {/* Description */}
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            {t(currentStepData.descKey, { ns: 'add' })}
          </p>

          {/* Step indicators */}
          <div className="flex items-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  index === currentStep 
                    ? 'w-6 bg-primary' 
                    : index < currentStep 
                      ? 'w-1.5 bg-primary/50' 
                      : 'w-1.5 bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleComplete}
              className="flex-1 h-12 rounded-xl text-muted-foreground hover:text-foreground"
            >
              {t('skipTour', { ns: 'add' })}
            </Button>
            <Button
              onClick={handleNext}
              className="flex-1 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              {isLastStep ? t('gotIt', { ns: 'add' }) : t('nextStep', { ns: 'add' })}
              {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
