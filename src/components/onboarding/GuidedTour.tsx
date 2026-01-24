import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, Upload, Check } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AvatarCropEditor } from '@/components/settings/AvatarCropEditor';
import cameraIcon from '@/assets/onboarding-camera.png';
import binocularsIcon from '@/assets/onboarding-binoculars.png';
import friendsIcon from '@/assets/onboarding-friends.png';
import spottLogo from '@/assets/spott-logo-onboarding.png';
import onboardingCollage from '@/assets/onboarding-collage-welcome.png';
import { useRealtimeEvent } from '@/hooks/useCentralizedRealtime';
export type GuidedTourStep = 'profile-photo' | 'map-guide' | 'explore-guide' | 'welcome' | 'complete';
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
  onStepChange
}) => {
  const navigate = useNavigate();
  const {
    t
  } = useTranslation('guidedTour');
  const {
    profile,
    updateProfile,
    refetch
  } = useProfile();
  const {
    user
  } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
  const [hasSavedPlace, setHasSavedPlace] = useState(false);

  // Update avatar preview when profile loads
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  // Track new place saved during this onboarding step (not existing places)
  useEffect(() => {
    if (currentStep !== 'map-guide' || !user?.id) return;

    // Reset hasSavedPlace to false when entering this step
    // We only care about NEW saves during onboarding, not existing ones
    setHasSavedPlace(false);

    // Also listen to location-save-changed event for immediate feedback
    const handleSaveChange = (e: CustomEvent) => {
      if (e.detail?.isSaved) {
        setHasSavedPlace(true);
      }
    };
    window.addEventListener('location-save-changed', handleSaveChange as EventListener);
    return () => {
      window.removeEventListener('location-save-changed', handleSaveChange as EventListener);
    };
  }, [currentStep, user?.id]);

  // Use centralized realtime for save events during onboarding - eliminates 2 channels
  const handleRealtimeSave = useCallback(() => {
    if (currentStep === 'map-guide') {
      setHasSavedPlace(true);
    }
  }, [currentStep]);

  useRealtimeEvent(['saved_place_insert', 'saved_location_insert'], handleRealtimeSave);

  // Prefetch ExplorePage when on map-guide step
  useEffect(() => {
    if (currentStep === 'map-guide' && hasSavedPlace) {
      // Preload the ExplorePage component
      import('@/components/ExplorePage').catch(() => {});
    }
  }, [currentStep, hasSavedPlace]);

  // Track if initial navigation for each step has been done
  const [initialNavDone, setInitialNavDone] = useState<Record<string, boolean>>({});

  // Handle step transitions and set global onboarding state
  useEffect(() => {
    if (!isActive) {
      document.body.removeAttribute('data-onboarding-step');
      return;
    }

    // Set current step as data attribute for other components to detect
    document.body.setAttribute('data-onboarding-step', currentStep);

    // Only navigate on initial entry to a step, not on every render
    if (!initialNavDone[currentStep]) {
      if (currentStep === 'profile-photo') {
        navigate('/');
      } else if (currentStep === 'map-guide') {
        navigate('/');
      } else if (currentStep === 'explore-guide') {
        // Navigate with state to open search bar focused
        navigate('/explore', {
          state: {
            fromOnboarding: true
          }
        });
      }
      setInitialNavDone(prev => ({
        ...prev,
        [currentStep]: true
      }));
    }
    return () => {
      document.body.removeAttribute('data-onboarding-step');
    };
  }, [currentStep, isActive, navigate, initialNavDone]);
  const handleSkipStep = () => {
    if (currentStep === 'profile-photo') {
      onStepChange('map-guide');
    } else if (currentStep === 'map-guide') {
      // Can't skip map-guide without saving at least one place
      if (!hasSavedPlace) {
        toast.error(t('saveFirst'));
        return;
      }
      onStepChange('explore-guide');
    } else if (currentStep === 'explore-guide') {
      onStepChange('welcome');
    } else if (currentStep === 'welcome') {
      onComplete();
    }
  };
  const handleNextStep = () => {
    if (currentStep === 'profile-photo') {
      onStepChange('map-guide');
    } else if (currentStep === 'map-guide') {
      if (!hasSavedPlace) {
        toast.error(t('saveFirst'));
        return;
      }
      onStepChange('explore-guide');
    } else if (currentStep === 'explore-guide') {
      onStepChange('welcome');
    } else if (currentStep === 'welcome') {
      onComplete();
    }
  };
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidImageType'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('imageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageForCrop(reader.result as string);
      setShowCropEditor(true);
    };
    reader.readAsDataURL(file);
  };
  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!user?.id) return;
    const file = new File([croppedBlob], 'avatar.jpg', {
      type: 'image/jpeg'
    });
    const previewUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(previewUrl);
    try {
      setIsUploading(true);
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/avatar/${fileName}`;
      const {
        error: uploadError
      } = await supabase.storage.from('avatars').upload(filePath, file, {
        upsert: true
      });
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await updateProfile({
        avatar_url: publicUrl
      });
      await refetch();
      queryClient.invalidateQueries({
        queryKey: ['profile']
      });
      toast.success(t('photoUploaded'));
      setTimeout(() => {
        onStepChange('map-guide');
      }, 1000);
    } catch (e) {
      console.error('Error uploading cropped avatar:', e);
      toast.error(t('uploadError'));
    } finally {
      setIsUploading(false);
    }
    setShowCropEditor(false);
    setTempImageForCrop(null);
  };
  const handleCropCancel = () => {
    setShowCropEditor(false);
    setTempImageForCrop(null);
  };
  if (!isActive) return null;

  // Show crop editor on top of everything
  if (showCropEditor && tempImageForCrop) {
    return <div className="fixed inset-0 z-[3000]">
        <AvatarCropEditor image={tempImageForCrop} onComplete={handleCropComplete} onCancel={handleCropCancel} />
      </div>;
  }

  // Profile photo step
  if (currentStep === 'profile-photo') {
    return <div className="fixed inset-0 z-[2000] bg-background flex flex-col safe-top safe-bottom">
        <input ref={fileInputRef} type="file" accept="image/*" onClick={e => {
        (e.currentTarget as HTMLInputElement).value = '';
      }} onChange={handleFileSelect} className="hidden" disabled={isUploading} />

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
            <img src={cameraIcon} alt="" className="w-12 h-12 object-contain" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">{t('profilePhotoTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('step')} 1/4</p>
          </div>

          <p className="text-center text-muted-foreground max-w-sm">
            {t('profilePhotoDescription')}
          </p>

          <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 relative group" disabled={isUploading}>
            <Avatar className="w-32 h-32 cursor-pointer border-4 border-primary/30">
              <AvatarImage src={avatarPreview || undefined} alt="Profile" />
              <AvatarFallback className="text-3xl bg-muted">
                {profile?.username?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
            {isUploading && <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>}
          </button>

          <div className="w-full max-w-sm flex gap-3 pt-4">
            <Button variant="outline" onClick={handleSkipStep} className="flex-1 rounded-full h-12 bg-white/80 dark:bg-secondary/30 border-gray-200 dark:border-transparent" disabled={isUploading}>
              {t('skip')}
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-full h-12" disabled={isUploading}>
              {isUploading ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : t('addPhoto')}
            </Button>
          </div>
        </div>
      </div>;
  }

  // Map guide step - Interactive overlay
  if (currentStep === 'map-guide') {
    return <MapGuideOverlay onNext={handleNextStep} hasSavedPlace={hasSavedPlace} t={t} />;
  }

  // Explore guide step
  if (currentStep === 'explore-guide') {
    return <ExploreGuideOverlay onSkip={handleSkipStep} onNext={handleNextStep} t={t} />;
  }

  // Welcome step - final step
  if (currentStep === 'welcome') {
    return <WelcomeScreen onComplete={onComplete} t={t} />;
  }
  return null;
};

// Map Guide Overlay - Clean, simple design
interface MapGuideOverlayProps {
  onNext: () => void;
  hasSavedPlace: boolean;
  t: (key: string) => string;
}
const MapGuideOverlay: React.FC<MapGuideOverlayProps> = ({
  onNext,
  hasSavedPlace,
  t
}) => {
  const [showFullOverlay, setShowFullOverlay] = useState(true);
  const [isPinCardOpen, setIsPinCardOpen] = useState(false);

  // Remove overlay from map after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowFullOverlay(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Detect when PinDetailCard is open by checking for its presence in DOM
  useEffect(() => {
    const checkPinCard = () => {
      const pinCard = document.querySelector('[data-pin-detail-card="true"]');
      setIsPinCardOpen(!!pinCard);
    };

    // Check initially
    checkPinCard();

    // Use MutationObserver to detect when PinDetailCard appears/disappears
    const observer = new MutationObserver(checkPinCard);
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    return () => observer.disconnect();
  }, []);
  return <>
      {/* TOP OVERLAY - ALWAYS visible during step 2, hidden when pin card is open */}
      {!isPinCardOpen && <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
          {showFullOverlay ?
      // Full screen dark overlay for first 4 seconds
      <div className="fixed inset-0 bg-black/40 transition-opacity duration-500" /> :
      // Only shade the header area (search bar + trending section) - approximately 200px from top
      <div className="h-[200px] bg-gradient-to-b from-black/40 via-black/25 to-transparent transition-opacity duration-500" />}
        </div>}

      {/* Simple bottom card - hidden when pin card is open */}
      {!isPinCardOpen && <div className="fixed bottom-6 left-4 right-4 z-[9999] pointer-events-auto">
          <div className="bg-background rounded-2xl p-5 shadow-2xl max-w-sm mx-auto border border-border/50">
            {/* Header with icon */}
            <div className="flex items-start gap-4 mb-2">
              <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                <img src={binocularsIcon} alt="" className="w-12 h-12 object-contain" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold leading-tight">{t('mapGuideTitle')}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{t('step')} 2/4</p>
              </div>
            </div>
            
            {/* Description - only show when not saved yet */}
            {!hasSavedPlace && <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {t('mapGuideDescription')}
              </p>}
            
            {/* Success state with continue button */}
            {hasSavedPlace ? <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-base font-semibold text-green-600 dark:text-green-400">{t('placeSaved')}</span>
                </div>
                <Button onClick={onNext} className="w-full rounded-2xl h-12 text-base font-semibold">
                  {t('continueToNext')}
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </> : null}
          </div>
        </div>}
    </>;
};

// Explore Guide Overlay
interface ExploreGuideOverlayProps {
  onSkip: () => void;
  onNext: () => void;
  t: (key: string) => string;
}
const ExploreGuideOverlay: React.FC<ExploreGuideOverlayProps> = ({
  onSkip,
  onNext,
  t
}) => {
  return <div className="fixed inset-0 z-[1999] pointer-events-none">
      {/* Bottom card - positioned at bottom to keep focus on suggested users */}
      <div className="absolute bottom-6 left-4 right-4 pointer-events-auto">
        <div className="bg-background rounded-2xl p-5 shadow-2xl animate-fade-in max-w-sm mx-auto border border-border/50">
          <div className="flex items-start gap-4 mb-2">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={friendsIcon} alt="" className="w-12 h-12 object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold leading-tight">{t('exploreTitle')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('step')} 3/4</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{t('exploreDescription')}</p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onSkip} className="flex-1 rounded-2xl h-12">
              {t('skip')}
            </Button>
            <Button onClick={onNext} className="flex-1 rounded-2xl h-12">
              {t('next')}
              <ChevronRight className="w-5 h-5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>;
};

// Welcome Screen - Final onboarding step (ONLY collage + title with logo + button)
interface WelcomeScreenProps {
  onComplete: () => void;
  t: (key: string) => string;
}
const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onComplete,
  t
}) => {
  return <div className="fixed inset-0 z-[2000] bg-background flex flex-col safe-top safe-bottom overflow-auto">
      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        {/* Collage image at top - this is the ONLY image content */}
        <div className="w-full max-w-sm mb-8">
          <img src={onboardingCollage} alt="Collage" className="w-full h-auto object-contain" />
        </div>

        {/* Welcome Title with Logo on same line */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <h1 className="text-3xl font-bold">{t('welcomeTitle')}</h1>
          <img src={spottLogo} alt="Spott" className="h-12 object-contain" />
        </div>
        
        <p className="text-muted-foreground text-sm text-center mb-10">{t('welcomeSubtitle')}</p>

        {/* Start button - no feature cards above this */}
        <Button onClick={onComplete} size="lg" className="w-full max-w-sm rounded-full h-14 text-base font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg">
          {t('letsGo')}
          <ChevronRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>;
};
export default GuidedTour;