import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MapPin, Search, FolderHeart, User, Users, Heart, MessageCircle, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  const steps = [
    {
      title: "Welcome to Spott! 🌍",
      description: "Discover and share amazing places with friends around the world",
      content: (
        <div className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/20">
              <MapPin className="w-8 h-8 mb-2 text-primary" />
              <h3 className="font-semibold text-sm">Map</h3>
              <p className="text-xs text-muted-foreground text-center">View all your saved spots</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/20">
              <Search className="w-8 h-8 mb-2 text-primary" />
              <h3 className="font-semibold text-sm">Explore</h3>
              <p className="text-xs text-muted-foreground text-center">Find new places & friends</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/20">
              <FolderHeart className="w-8 h-8 mb-2 text-primary" />
              <h3 className="font-semibold text-sm">Lists</h3>
              <p className="text-xs text-muted-foreground text-center">Curate & share collections</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-secondary/20">
              <User className="w-8 h-8 mb-2 text-primary" />
              <h3 className="font-semibold text-sm">Profile</h3>
              <p className="text-xs text-muted-foreground text-center">Your stats & settings</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Connect with Friends 👥",
      description: "Discover your friends' favorite spots and share yours!",
      content: (
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
              <Users className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Follow Friends</h3>
                <p className="text-xs text-muted-foreground">See what places your friends are loving</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
              <Heart className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Like & Comment</h3>
                <p className="text-xs text-muted-foreground">Engage with places and posts from your network</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
              <Share2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Share Experiences</h3>
                <p className="text-xs text-muted-foreground">Post stories and recommend places to friends</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-secondary/20">
              <MessageCircle className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm">Direct Messages</h3>
                <p className="text-xs text-muted-foreground">Send places and recommendations privately</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Let's Get Started! 🚀",
      description: "Save 3 locations to begin discovering your world map",
      content: (
        <div className="space-y-6 py-4">
          <div className="bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Your First Mission</h3>
              <p className="text-sm text-muted-foreground">
                Find and save at least 3 places to populate your map:
              </p>
            </div>
            <div className="space-y-2 text-left text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">1</div>
                <span>Your favorite hometown spot</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">2</div>
                <span>A restaurant you love</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">3</div>
                <span>A dream travel destination</span>
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
        toast.error('Failed to save progress');
        return;
      }

      // Close the modal and trigger completion callback
      onComplete();
      
      // Navigate to explore page to help user start saving locations
      if (currentStep === steps.length - 1) {
        navigate('/discover');
        toast.success('Welcome to Spott! Start exploring places to save.', {
          duration: 4000,
        });
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
      toast.error('Something went wrong');
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md max-h-[85vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Step {currentStep + 1} of {steps.length}</span>
              {currentStep < steps.length - 1 && (
                <button
                  onClick={handleSkip}
                  className="hover:text-foreground transition-colors"
                >
                  Skip
                </button>
              )}
            </div>
          </div>

          {/* Step content */}
          <div className="space-y-3">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">{steps[currentStep].title}</h2>
              <p className="text-sm text-muted-foreground">
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
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1"
            >
              {currentStep === steps.length - 1 ? "Let's Go!" : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingModal;
