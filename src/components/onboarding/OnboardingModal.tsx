import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Camera, MapPin, Users } from 'lucide-react';
import rocketIcon from '@/assets/onboarding-rocket.png';
import mapIcon from '@/assets/onboarding-map.png';
import friendsIcon from '@/assets/onboarding-friends.png';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
  onStartGuidedTour?: () => void;
}

const OnboardingModal = ({ open, onComplete, onStartGuidedTour }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [languageLoaded, setLanguageLoaded] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation('onboarding');

  // Load user's language from profile before rendering content
  useEffect(() => {
    const loadLanguage = async () => {
      if (!user?.id || languageLoaded) return;

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', user.id)
          .single();

        const lang = profile?.language || sessionStorage.getItem('signup_language') || localStorage.getItem('i18nextLng') || 'en';
        
        if (i18n.language !== lang) {
          await i18n.changeLanguage(lang);
          localStorage.setItem('i18nextLng', lang);
        }
      } catch (e) {
        console.error('Error loading language for onboarding:', e);
      } finally {
        setLanguageLoaded(true);
      }
    };

    if (open) {
      loadLanguage();
    }
  }, [user?.id, open, i18n, languageLoaded]);

  const steps = [
    // Step 1: Profile Photo
    {
      title: t('profilePhotoTitle'),
      description: t('profilePhotoDescription'),
      content: (
        <div className="flex flex-col items-center py-8">
          <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <Camera className="w-16 h-16 text-primary" />
          </div>
          <p className="text-center text-muted-foreground max-w-xs">
            {t('profilePhotoTip')}
          </p>
        </div>
      ),
    },
    // Step 2: Map Guide
    {
      title: t('mapGuideTitle'),
      description: t('mapGuideDescription'),
      content: (
        <div className="space-y-6 py-4">
          <div className="flex justify-center mb-4">
            <img src={rocketIcon} alt="Rocket" className="w-24 h-24 object-contain" />
          </div>
          <div className="bg-secondary/20 rounded-2xl p-5">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                <img src={mapIcon} alt="Map" className="w-10 h-10 object-contain" />
              </div>
            </div>
            <h3 className="font-bold text-lg text-center mb-2">{t('firstMission')}</h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {t('firstMissionDescription')}
            </p>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
                <span className="text-sm">{t('mission1')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
                <span className="text-sm">{t('mission2')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/30 flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
                <span className="text-sm">{t('mission3')}</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    // Step 3: Explore / Friends
    {
      title: t('exploreGuideTitle'),
      description: t('exploreGuideDescription'),
      content: (
        <div className="flex flex-col items-center py-8">
          <img src={friendsIcon} alt="Friends" className="w-28 h-28 object-contain mb-6" />
          <div className="space-y-4 w-full max-w-sm">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20">
              <Users className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">{t('findFriends')}</h4>
                <p className="text-xs text-muted-foreground">{t('findFriendsDescription')}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20">
              <MapPin className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm">{t('discoverPlaces')}</h4>
                <p className="text-xs text-muted-foreground">{t('discoverPlacesDescription')}</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    if (!user?.id) return;

    try {
      // Mark onboarding as completed in the database
      const { error } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating onboarding status:', error);
        toast.error(t('errorSaving') || 'Failed to save progress');
        return;
      }

      // Close the modal and trigger completion callback
      onComplete();
      
      // Start the guided tour instead of navigating to /discover
      if (currentStep === steps.length - 1 && onStartGuidedTour) {
        onStartGuidedTour();
      } else if (currentStep === steps.length - 1) {
        // Fallback if no guided tour handler
        navigate('/');
        toast.success(t('welcomeToast') || 'Welcome to Spott! Start exploring places to save.', {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error(t('errorGeneric') || 'Something went wrong');
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  if (!open) return null;
  
  // Wait for language to load before rendering content
  if (!languageLoaded) {
    return (
      <div className="fixed inset-0 z-[2000] bg-background flex items-center justify-center safe-top safe-bottom">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        [class*="bottom-navigation"],
        [class*="NewBottomNavigation"],
        [class*="BusinessBottomNavigation"],
        nav[class*="fixed bottom"],
        div[class*="fixed bottom-0"] {
          display: none !important;
        }
      `}</style>
      <div className="fixed inset-0 z-[2000] bg-background flex items-center justify-center safe-top safe-bottom">
        <div className="w-full h-full max-w-2xl mx-auto flex flex-col p-6 pt-safe pb-safe">
          {/* Progress bar */}
          <div className="space-y-2 mb-4">
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('step')} {currentStep + 1} {t('of')} {steps.length}</span>
              {currentStep < steps.length - 1 && (
                <button
                  onClick={handleSkip}
                  className="hover:text-foreground transition-colors"
                >
                  {t('skip')}
                </button>
              )}
            </div>
          </div>

          {/* Step content with transition */}
          <div 
            key={currentStep}
            className="flex-1 flex flex-col justify-center space-y-3 animate-fade-in"
          >
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">{steps[currentStep].title}</h2>
              <p className="text-base text-muted-foreground">
                {steps[currentStep].description}
              </p>
            </div>
            {steps[currentStep].content}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-2 pt-4">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 rounded-2xl h-12"
              >
                {t('back')}
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 rounded-2xl h-12"
            >
              {currentStep === steps.length - 1 ? t('letsGo') : t('next')}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingModal;
