import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { X, ChevronRight, MapPin, Users, Upload } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { AvatarCropEditor } from '@/components/settings/AvatarCropEditor';
import cameraIcon from '@/assets/onboarding-camera.png';

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

  // Update avatar preview when profile loads
  useEffect(() => {
    if (profile?.avatar_url) {
      setAvatarPreview(profile.avatar_url);
    }
  }, [profile?.avatar_url]);

  // Handle step transitions
  useEffect(() => {
    if (!isActive) return;

    if (currentStep === 'profile-photo') {
      // Stay on home page for photo upload step
      navigate('/');
    } else if (currentStep === 'map-guide') {
      navigate('/');
    } else if (currentStep === 'explore-guide') {
      navigate('/explore');
    }
  }, [currentStep, isActive, navigate]);

  const handleSkipStep = () => {
    if (currentStep === 'profile-photo') {
      onStepChange('map-guide');
    } else if (currentStep === 'map-guide') {
      onStepChange('explore-guide');
    } else if (currentStep === 'explore-guide') {
      onComplete();
    }
  };

  const handleNextStep = () => {
    if (currentStep === 'profile-photo') {
      onStepChange('map-guide');
    } else if (currentStep === 'map-guide') {
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

    // Open crop editor
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
      
      // Automatically move to next step after successful upload
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

  // Profile photo step - direct upload experience
  if (currentStep === 'profile-photo') {
    return (
      <div className="fixed inset-0 z-[2000] bg-background flex flex-col safe-top safe-bottom">
        {/* Hidden file input */}
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
          {/* Camera icon */}
          <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
            <img src={cameraIcon} alt="" className="w-12 h-12 object-contain" />
          </div>

          {/* Title and step indicator */}
          <div className="text-center space-y-1">
            <h2 className="text-2xl font-bold">{t('profilePhotoTitle')}</h2>
            <p className="text-sm text-muted-foreground">{t('step')} 1/3</p>
          </div>

          {/* Description */}
          <p className="text-center text-muted-foreground max-w-sm">
            {t('profilePhotoDescription')}
          </p>

          {/* Avatar preview */}
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

          {/* Buttons */}
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

// Map Guide Overlay Component - Full screen informational page
interface MapGuideOverlayProps {
  onSkip: () => void;
  onNext: () => void;
  t: (key: string) => string;
}

const MapGuideOverlay: React.FC<MapGuideOverlayProps> = ({ onSkip, onNext, t }) => {
  return (
    <div className="fixed inset-0 z-[2000] bg-background flex flex-col safe-top safe-bottom">
      <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
        {/* Map icon */}
        <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center">
          <MapPin className="w-10 h-10 text-primary" />
        </div>

        {/* Title and step indicator */}
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">{t('mapGuideTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('step')} 2/3</p>
        </div>

        {/* Description */}
        <p className="text-center text-muted-foreground max-w-sm">
          {t('mapGuideDescription')}
        </p>

        {/* Feature cards */}
        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/20">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">1</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">{t('categoriesTitle')}</h4>
              <p className="text-xs text-muted-foreground">{t('categoriesShort')}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/20">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">2</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">{t('saveLocationTitle')}</h4>
              <p className="text-xs text-muted-foreground">{t('saveLocationShort')}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/20">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">3</span>
            </div>
            <div>
              <h4 className="font-semibold text-sm">{t('filtersTitle')}</h4>
              <p className="text-xs text-muted-foreground">{t('filtersShort')}</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="w-full max-w-sm flex gap-3 pt-4">
          <Button 
            variant="outline" 
            onClick={onSkip} 
            className="flex-1 rounded-xl h-12"
          >
            {t('skip')}
          </Button>
          <Button 
            onClick={onNext} 
            className="flex-1 rounded-xl h-12"
          >
            {t('next')}
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
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
