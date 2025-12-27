import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import mapIcon from '@/assets/onboarding-map.png';
import exploreIcon from '@/assets/onboarding-explore.png';
import listIcon from '@/assets/onboarding-list.png';
import profileIcon from '@/assets/onboarding-profile.png';
import followIcon from '@/assets/onboarding-follow.png';
import likeIcon from '@/assets/onboarding-like.png';
import shareIcon from '@/assets/onboarding-share.png';
import messagesIcon from '@/assets/onboarding-messages.png';
import rocketIcon from '@/assets/onboarding-rocket.png';
import spottLogo from '@/assets/spott-logo-onboarding.png';

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
    {
      title: t('welcomeTitle'),
      description: t('welcomeDescription'),
      showLogo: true,
      content: (
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary/20">
              <img src={mapIcon} alt={t('map')} className="w-12 h-12 mb-2 object-contain" />
              <h3 className="font-semibold text-sm">{t('map')}</h3>
              <p className="text-xs text-muted-foreground text-center">{t('mapDescription')}</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary/20">
              <img src={exploreIcon} alt={t('explore')} className="w-12 h-12 mb-2 object-contain" />
              <h3 className="font-semibold text-sm">{t('explore')}</h3>
              <p className="text-xs text-muted-foreground text-center">{t('exploreDescription')}</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary/20">
              <img src={listIcon} alt={t('lists')} className="w-12 h-12 mb-2 object-contain" />
              <h3 className="font-semibold text-sm">{t('lists')}</h3>
              <p className="text-xs text-muted-foreground text-center">{t('listsDescription')}</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-2xl bg-secondary/20">
              <img src={profileIcon} alt={t('profile')} className="w-12 h-12 mb-2 object-contain" />
              <h3 className="font-semibold text-sm">{t('profile')}</h3>
              <p className="text-xs text-muted-foreground text-center">{t('profileDescription')}</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t('connectTitle'),
      description: t('connectDescription'),
      content: (
        <div className="space-y-2 py-2">
          <div className="space-y-2">
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/20">
              <img src={followIcon} alt={t('followFriends')} className="w-9 h-9 object-contain flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{t('followFriends')}</h3>
                <p className="text-xs text-muted-foreground">{t('followFriendsDescription')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/20">
              <img src={likeIcon} alt={t('likeComment')} className="w-9 h-9 object-contain flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{t('likeComment')}</h3>
                <p className="text-xs text-muted-foreground">{t('likeCommentDescription')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/20">
              <img src={shareIcon} alt={t('shareExperiences')} className="w-9 h-9 object-contain flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{t('shareExperiences')}</h3>
                <p className="text-xs text-muted-foreground">{t('shareExperiencesDescription')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-secondary/20">
              <img src={messagesIcon} alt={t('directMessages')} className="w-9 h-9 object-contain flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{t('directMessages')}</h3>
                <p className="text-xs text-muted-foreground">{t('directMessagesDescription')}</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t('getStartedTitle'),
      description: t('getStartedDescription'),
      content: (
        <div className="space-y-6 py-4">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-2xl p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <img src={rocketIcon} alt="Mission" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">{t('firstMission')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('firstMissionDescription')}
              </p>
            </div>
            <div className="space-y-2 text-left text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                <span>{t('mission1')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                <span>{t('mission2')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                <span>{t('mission3')}</span>
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
              {steps[currentStep].showLogo ? (
                <div className="flex flex-col items-center gap-2">
                  <h2 className="text-3xl font-bold">
                    {steps[currentStep].title}
                  </h2>
                  <img src={spottLogo} alt="Spott" className="h-12 object-contain" />
                </div>
              ) : (
                <h2 className="text-3xl font-bold">
                  {steps[currentStep].title}
                </h2>
              )}
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
