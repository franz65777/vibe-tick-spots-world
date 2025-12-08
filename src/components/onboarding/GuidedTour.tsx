import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, MapPin, Users, Upload, Check, Sparkles } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AvatarCropEditor } from '@/components/settings/AvatarCropEditor';
import cameraIcon from '@/assets/onboarding-camera.png';
import binocularsIcon from '@/assets/onboarding-binoculars.png';

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
  const { profile, updateProfile, refetch } = useProfile();
  const { user } = useAuth();
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
    
    // Subscribe to NEW saved_places inserts only
    const channel = supabase
      .channel('saved_places_onboarding')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'saved_places',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setHasSavedPlace(true);
          toast.success(t('placeSaved'));
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentStep, user?.id, t]);

  // Prefetch ExplorePage when on map-guide step
  useEffect(() => {
    if (currentStep === 'map-guide' && hasSavedPlace) {
      // Preload the ExplorePage component
      import('@/components/ExplorePage').catch(() => {});
    }
  }, [currentStep, hasSavedPlace]);

  // Handle step transitions
  useEffect(() => {
    if (!isActive) return;

    if (currentStep === 'profile-photo') {
      navigate('/');
    } else if (currentStep === 'map-guide') {
      navigate('/');
    } else if (currentStep === 'explore-guide') {
      // Navigate with state to open search bar focused
      navigate('/explore', { state: { fromOnboarding: true } });
    }
  }, [currentStep, isActive, navigate]);

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

    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    const previewUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(previewUrl);

    try {
      setIsUploading(true);
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/avatar/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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
    return (
      <div className="fixed inset-0 z-[3000]">
        <AvatarCropEditor
          image={tempImageForCrop}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      </div>
    );
  }

  // Profile photo step
  if (currentStep === 'profile-photo') {
    return (
      <div className="fixed inset-0 z-[2000] bg-background flex flex-col safe-top safe-bottom">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ''; }}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
            <img src={cameraIcon} alt="" className="w-12 h-12 object-contain" />
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">{t('profilePhotoTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('step')} 1/3</p>
          </div>

          <p className="text-center text-muted-foreground max-w-sm">
            {t('profilePhotoDescription')}
          </p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 relative group"
            disabled={isUploading}
          >
            <Avatar className="w-32 h-32 cursor-pointer border-4 border-primary/30">
              <AvatarImage src={avatarPreview || undefined} alt="Profile" />
              <AvatarFallback className="text-3xl bg-muted">
                {profile?.username?.substring(0, 2).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-8 h-8 text-white" />
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </button>

          <div className="w-full max-w-sm flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={handleSkipStep} 
              className="flex-1 rounded-xl h-12"
              disabled={isUploading}
            >
              {t('skip')}
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex-1 rounded-xl h-12"
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                t('addPhoto')
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Map guide step - Interactive overlay
  if (currentStep === 'map-guide') {
    return <MapGuideOverlay onNext={handleNextStep} hasSavedPlace={hasSavedPlace} t={t} />;
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

// Map Guide Overlay - Clean, simple design
interface MapGuideOverlayProps {
  onNext: () => void;
  hasSavedPlace: boolean;
  t: (key: string) => string;
}

const MapGuideOverlay: React.FC<MapGuideOverlayProps> = ({ onNext, hasSavedPlace, t }) => {
  return (
    <div className="fixed inset-0 z-[1999] pointer-events-none">
      {/* Dim overlay - allows interaction with map */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/20 to-black/70" />

      {/* Simple bottom card - only the card is interactive */}
      <div className="absolute bottom-6 left-4 right-4 pointer-events-auto">
        <div className="bg-background rounded-2xl p-5 shadow-2xl max-w-sm mx-auto border border-border/50">
          {/* Header with icon */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
              <img src={binocularsIcon} alt="" className="w-12 h-12 object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold leading-tight">{t('mapGuideTitle')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('step')} 2/3</p>
            </div>
          </div>
          
          {/* Description - only show when not saved yet */}
          {!hasSavedPlace && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {t('mapGuideDescription')}
            </p>
          )}
          
          {/* Success state with continue button */}
          {hasSavedPlace ? (
            <>
              <div className="flex items-center gap-3 mb-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-5 h-5 text-white" />
                </div>
                <span className="text-base font-semibold text-green-600 dark:text-green-400">{t('placeSaved')}</span>
              </div>
              <Button 
                onClick={onNext} 
                className="w-full rounded-xl h-12 text-base font-semibold"
              >
                {t('continueToNext')}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// Explore Guide Overlay
interface ExploreGuideOverlayProps {
  onSkip: () => void;
  onComplete: () => void;
  t: (key: string) => string;
}

const ExploreGuideOverlay: React.FC<ExploreGuideOverlayProps> = ({ onSkip, onComplete, t }) => {
  return (
    <div className="fixed inset-0 z-[1999] pointer-events-none">
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
