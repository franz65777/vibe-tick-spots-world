import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, Camera, MapPin, Users } from 'lucide-react';
import EditProfileModal from '@/components/settings/EditProfileModal';

export type GuidedTourStep = 'profile-photo' | 'map-guide' | 'explore-guide' | 'complete';

interface GuidedTourProps {
  isActive: boolean;
  onComplete: () => void;
  currentStep: GuidedTourStep;
  onStepChange: (step: GuidedTourStep) => void;
}

const GuidedTour: React.FC<GuidedTourProps> = ({
  isActive,
  onComplete,
  currentStep,
  onStepChange,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation('guidedTour');
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Handle step transitions
  useEffect(() => {
    if (!isActive) return;

    if (currentStep === 'profile-photo') {
      setShowProfileModal(true);
    } else if (currentStep === 'map-guide') {
      setShowProfileModal(false);
      navigate('/');
    } else if (currentStep === 'explore-guide') {
      navigate('/explore');
    }
  }, [currentStep, isActive, navigate]);

  const handleSkipStep = () => {
    if (currentStep === 'profile-photo') {
      setShowProfileModal(false);
      onStepChange('map-guide');
    } else if (currentStep === 'map-guide') {
      onStepChange('explore-guide');
    } else if (currentStep === 'explore-guide') {
      onComplete();
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'profile-photo') {
      setShowProfileModal(false);
      onStepChange('map-guide');
    } else if (currentStep === 'map-guide') {
      onStepChange('explore-guide');
    } else if (currentStep === 'explore-guide') {
      onComplete();
    }
  };

  const handleProfileModalClose = (open: boolean) => {
    if (!open) {
      // When profile modal closes, move to next step
      onStepChange('map-guide');
    }
    setShowProfileModal(open);
  };

  if (!isActive) return null;

  // Profile photo step - uses EditProfileModal
  if (currentStep === 'profile-photo') {
    return (
      <>
        {/* Overlay with coach mark */}
        <div className="fixed inset-0 z-[1999] bg-black/60 flex items-start justify-center pt-20">
          <div className="bg-background rounded-2xl p-6 mx-4 max-w-sm shadow-xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center">
                <Camera className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-lg">{t('profilePhotoTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('step')} 1/3</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('profilePhotoDescription')}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSkipStep} className="flex-1 rounded-xl">
                {t('skip')}
              </Button>
              <Button onClick={() => setShowProfileModal(true)} className="flex-1 rounded-xl">
                {t('addPhoto')}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Edit Profile Modal */}
        <EditProfileModal 
          open={showProfileModal} 
          onOpenChange={handleProfileModalClose}
        />
      </>
    );
  }

  // Map guide step
  if (currentStep === 'map-guide') {
    return (
      <MapGuideOverlay 
        onSkip={handleSkipStep}
        onNext={handleNextStep}
        t={t}
      />
    );
  }

  // Explore guide step
  if (currentStep === 'explore-guide') {
    return (
      <ExploreGuideOverlay
        onSkip={handleSkipStep}
        onComplete={onComplete}
        t={t}
      />
    );
  }

  return null;
};

// Map Guide Overlay Component
interface MapGuideOverlayProps {
  onSkip: () => void;
  onNext: () => void;
  t: (key: string) => string;
}

const MapGuideOverlay: React.FC<MapGuideOverlayProps> = ({ onSkip, onNext, t }) => {
  const [subStep, setSubStep] = useState<'categories' | 'save-location' | 'filters'>('categories');

  const handleNext = () => {
    if (subStep === 'categories') {
      setSubStep('save-location');
    } else if (subStep === 'save-location') {
      setSubStep('filters');
    } else {
      onNext();
    }
  };

  const getSubStepContent = () => {
    switch (subStep) {
      case 'categories':
        return {
          title: t('categoriesTitle'),
          description: t('categoriesDescription'),
          highlightPosition: 'top', // Categories are at the top
        };
      case 'save-location':
        return {
          title: t('saveLocationTitle'),
          description: t('saveLocationDescription'),
          highlightPosition: 'center', // Pin cards are in center
        };
      case 'filters':
        return {
          title: t('filtersTitle'),
          description: t('filtersDescription'),
          highlightPosition: 'bottom-left', // Filters are bottom-left
        };
    }
  };

  const content = getSubStepContent();
  const stepNumber = subStep === 'categories' ? '2.1' : subStep === 'save-location' ? '2.2' : '2.3';

  return (
    <div className="fixed inset-0 z-[1999] pointer-events-none">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Highlight cutout based on position */}
      {subStep === 'categories' && (
        <div className="absolute top-0 left-0 right-0 h-28 bg-transparent" 
             style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1 }} />
      )}
      
      {subStep === 'filters' && (
        <div className="absolute bottom-20 left-4 w-48 h-14 rounded-xl bg-transparent"
             style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1 }} />
      )}

      {/* Coach mark card */}
      <div className={`absolute pointer-events-auto ${
        subStep === 'categories' ? 'top-32 left-4 right-4' : 
        subStep === 'filters' ? 'bottom-40 left-4 right-4' :
        'top-1/2 left-4 right-4 -translate-y-1/2'
      }`}>
        <div className="bg-background rounded-2xl p-5 shadow-xl animate-fade-in max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold">{content.title}</h3>
              <p className="text-xs text-muted-foreground">{t('step')} {stepNumber}/3</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{content.description}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSkip} className="flex-1 rounded-xl text-sm">
              {t('skip')}
            </Button>
            <Button onClick={handleNext} className="flex-1 rounded-xl text-sm">
              {subStep === 'filters' ? t('next') : t('gotIt')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Explore Guide Overlay Component
interface ExploreGuideOverlayProps {
  onSkip: () => void;
  onComplete: () => void;
  t: (key: string) => string;
}

const ExploreGuideOverlay: React.FC<ExploreGuideOverlayProps> = ({ onSkip, onComplete, t }) => {
  return (
    <div className="fixed inset-0 z-[1999] pointer-events-none">
      {/* Semi-transparent overlay */}
      <div className="absolute inset-0 bg-black/50" />
      
      {/* Highlight the search area */}
      <div className="absolute top-0 left-0 right-0 h-32 bg-transparent"
           style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)', position: 'relative', zIndex: 1 }} />

      {/* Coach mark card */}
      <div className="absolute top-36 left-4 right-4 pointer-events-auto">
        <div className="bg-background rounded-2xl p-5 shadow-xl animate-fade-in max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold">{t('exploreTitle')}</h3>
              <p className="text-xs text-muted-foreground">{t('step')} 3/3</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('exploreDescription')}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onSkip} className="flex-1 rounded-xl text-sm">
              {t('skip')}
            </Button>
            <Button onClick={onComplete} className="flex-1 rounded-xl text-sm">
              {t('finish')}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuidedTour;
