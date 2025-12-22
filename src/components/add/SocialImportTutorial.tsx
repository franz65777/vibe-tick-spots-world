import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Instagram, Share2, ArrowRight, Smartphone } from "lucide-react";

interface SocialImportTutorialProps {
  open: boolean;
  onClose: () => void;
}

export const SocialImportTutorial = ({ open, onClose }: SocialImportTutorialProps) => {
  const { t } = useTranslation();

  const steps = [
    {
      icon: Instagram,
      title: t('socialImport.step1Title', 'Open Instagram'),
      description: t('socialImport.step1Desc', 'Find a post with a tagged location you want to save')
    },
    {
      icon: Share2,
      title: t('socialImport.step2Title', 'Tap Share'),
      description: t('socialImport.step2Desc', 'Tap the share button on the post')
    },
    {
      icon: Smartphone,
      title: t('socialImport.step3Title', 'Select Spott'),
      description: t('socialImport.step3Desc', 'Choose Spott from the share menu to import the location')
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm mx-auto glass-card">
        <DialogHeader>
          <DialogTitle className="text-center flex items-center justify-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            {t('socialImport.title', 'Import from Instagram')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('socialImport.intro', 'Save locations from Instagram posts directly to Spott')}
          </p>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <step.icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('socialImport.step', 'Step')} {index + 1}
                    </span>
                  </div>
                  <h4 className="font-medium text-sm">{step.title}</h4>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground/50 mt-2" />
                )}
              </div>
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground text-center">
              {t('socialImport.note', 'Make sure Spott is installed and you\'re logged in')}
            </p>
          </div>
        </div>

        <Button onClick={onClose} className="w-full">
          {t('common.gotIt', 'Got it!')}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
