import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import mapIcon from '@/assets/onboarding-map.png';
import exploreIcon from '@/assets/onboarding-explore.png';
import listIcon from '@/assets/onboarding-list.png';
import profileIcon from '@/assets/onboarding-profile.png';
import followIcon from '@/assets/onboarding-follow.png';
import likeIcon from '@/assets/onboarding-like.png';
import shareIcon from '@/assets/onboarding-share.png';
import messagesIcon from '@/assets/onboarding-messages.png';
import spottLogo from '@/assets/spott-logo-onboarding.png';
import onboardingCollage from '@/assets/onboarding-collage.png';

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
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/70 dark:bg-secondary/30 backdrop-blur-sm shadow-sm border border-white/50 dark:border-transparent">
              <img src={mapIcon} alt={t('map')} className="w-12 h-12 mb-2 object-contain" />
              <h3 className="font-semibold text-sm">{t('map')}</h3>
              <p className="text-xs text-muted-foreground text-center">{t('mapDescription')}</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/70 dark:bg-secondary/30 backdrop-blur-sm shadow-sm border border-white/50 dark:border-transparent">
              <img src={exploreIcon} alt={t('explore')} className="w-12 h-12 mb-2 object-contain" />
              <h3 className="font-semibold text-sm">{t('explore')}</h3>
              <p className="text-xs text-muted-foreground text-center">{t('exploreDescription')}</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/70 dark:bg-secondary/30 backdrop-blur-sm shadow-sm border border-white/50 dark:border-transparent">
              <img src={listIcon} alt={t('lists')} className="w-12 h-12 mb-2 object-contain" />
              <h3 className="font-semibold text-sm">{t('lists')}</h3>
              <p className="text-xs text-muted-foreground text-center">{t('listsDescription')}</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-2xl bg-white/70 dark:bg-secondary/30 backdrop-blur-sm shadow-sm border border-white/50 dark:border-transparent">
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
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-secondary/30 backdrop-blur-sm shadow-sm border border-white/50 dark:border-transparent">
              <img src={followIcon} alt={t('followFriends')} className="w-9 h-9 object-contain flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{t('followFriends')}</h3>
                <p className="text-xs text-muted-foreground">{t('followFriendsDescription')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-secondary/30 backdrop-blur-sm shadow-sm border border-white/50 dark:border-transparent">
              <img src={likeIcon} alt={t('likeComment')} className="w-9 h-9 object-contain flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{t('likeComment')}</h3>
                <p className="text-xs text-muted-foreground">{t('likeCommentDescription')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-secondary/30 backdrop-blur-sm shadow-sm border border-white/50 dark:border-transparent">
              <img src={shareIcon} alt={t('shareExperiences')} className="w-9 h-9 object-contain flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">{t('shareExperiences')}</h3>
                <p className="text-xs text-muted-foreground">{t('shareExperiencesDescription')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-secondary/30 backdrop-blur-sm shadow-sm border border-white/50 dark:border-transparent">
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
      title: t('welcomeTitle'),
      description: t('getStartedDescription'),
      showFinalLogo: true,
      content: (
        <div className="flex flex-col items-center py-4">
          <img 
            src={onboardingCollage} 
            alt="Spott experiences" 
            className="w-full max-w-sm object-contain"
          />
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
      <div className="fixed inset-0 z-[2000] flex items-center justify-center safe-top safe-bottom bg-gradient-to-br from-blue-50/80 via-white/60 to-purple-50/80 dark:from-slate-900/80 dark:via-slate-800/60 dark:to-slate-900/80 backdrop-blur-xl">
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
                <h2 className="text-3xl font-bold flex items-center justify-center gap-2 flex-wrap">
                  {steps[currentStep].title}
                  <img src={spottLogo} alt="Spott" className="h-12 object-contain" />
                </h2>
              ) : steps[currentStep].showFinalLogo ? (
                <h2 className="text-3xl font-bold flex items-center justify-center gap-2 flex-wrap">
                  {steps[currentStep].title}
                  <img src={spottLogo} alt="Spott" className="h-10 object-contain" />
                </h2>
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
          <div className="flex gap-3 pt-4">
            {currentStep > 0 && currentStep < steps.length - 1 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 rounded-full h-14 text-base font-medium bg-white/80 dark:bg-secondary/30 border-gray-200 dark:border-transparent hover:bg-white dark:hover:bg-secondary/50"
              >
                {t('back')}
              </Button>
            )}
            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleNext}
                className="flex-1 rounded-full h-14 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-semibold text-lg"
              >
                {t('letsGo')}
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-1 rounded-full h-14 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white"
              >
                {t('next')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default OnboardingModal;
