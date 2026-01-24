import React, { useState, useCallback } from 'react';
import { Camera, MapPin, Share2, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { haptics } from '@/utils/haptics';

interface AddPageOnboardingProps {
  onComplete: () => void;
}

const steps = [
  {
    icon: Camera,
    titleKey: 'onboardingStep1Title',
    descKey: 'onboardingStep1Desc',
    gradient: 'from-blue-500 to-cyan-400',
    shadowColor: 'shadow-blue-500/40',
  },
  {
    icon: MapPin,
    titleKey: 'onboardingStep2Title',
    descKey: 'onboardingStep2Desc',
    gradient: 'from-emerald-500 to-teal-400',
    shadowColor: 'shadow-emerald-500/40',
  },
  {
    icon: Share2,
    titleKey: 'onboardingStep3Title',
    descKey: 'onboardingStep3Desc',
    gradient: 'from-violet-500 to-purple-400',
    shadowColor: 'shadow-violet-500/40',
  },
];

export const AddPageOnboarding: React.FC<AddPageOnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { t } = useTranslation('add');
  
  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = useCallback(async () => {
    await haptics.selection();
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [isLastStep]);

  const handleComplete = useCallback(async () => {
    await haptics.success();
    setIsExiting(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  }, [onComplete]);

  return (
    <div 
      className={cn(
        "fixed inset-0 z-[2000] flex items-end justify-center transition-opacity duration-300",
        isExiting ? "opacity-0" : "opacity-100"
      )}
    >
      {/* Backdrop with gradient overlay */}
      <div 
        className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30 backdrop-blur-sm"
        onClick={handleComplete}
      />
      
      {/* Card Container - positioned above bottom nav with pb-28 */}
      <div 
        className={cn(
          "relative w-full max-w-sm mx-4 mb-28 transition-all duration-500",
          isExiting ? "translate-y-8 opacity-0" : "animate-slide-up-bounce"
        )}
      >
        {/* Main Card with glass morphism */}
        <div className="relative bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/30 overflow-hidden border border-white/10">
          {/* Decorative gradient bar at top */}
          <div className={cn(
            "h-1.5 w-full bg-gradient-to-r",
            currentStepData.gradient
          )} />
          
          {/* Close button */}
          <button
            onClick={handleComplete}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          
          <div className="p-6 pt-5">
            {/* Step indicators - pill style */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500 ease-out",
                    index === currentStep 
                      ? "w-8 bg-gradient-to-r " + step.gradient
                      : index < currentStep 
                        ? "w-2 bg-primary/60" 
                        : "w-2 bg-muted-foreground/20"
                  )}
                />
              ))}
            </div>
            
            {/* Icon with animated glow */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                {/* Glow effect */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl bg-gradient-to-br blur-xl opacity-50 animate-pulse-slow",
                  currentStepData.gradient
                )} />
                
                {/* Icon container */}
                <div className={cn(
                  "relative w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                  currentStepData.gradient,
                  currentStepData.shadowColor
                )}>
                  <Icon className="w-8 h-8 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-foreground mb-2">
                {t(currentStepData.titleKey)}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed px-2">
                {t(currentStepData.descKey)}
              </p>
            </div>
            
            {/* Step counter */}
            <div className="text-center mb-4">
              <span className="text-xs font-medium text-muted-foreground/60">
                {currentStep + 1} / {steps.length}
              </span>
            </div>
            
            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="ghost"
                onClick={handleComplete}
                className="flex-1 h-12 rounded-xl border border-border/50 text-muted-foreground hover:bg-muted/50 hover:text-foreground font-medium"
              >
                {t('skipTour')}
              </Button>
              
              <Button
                onClick={handleNext}
                className={cn(
                  "flex-1 h-12 rounded-xl bg-gradient-to-r text-white font-semibold shadow-lg transition-all duration-200 active:scale-[0.97]",
                  currentStepData.gradient,
                  currentStepData.shadowColor
                )}
              >
                {isLastStep ? t('gotIt') : t('nextStep')}
                {!isLastStep && <ChevronRight className="w-5 h-5 ml-1" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
