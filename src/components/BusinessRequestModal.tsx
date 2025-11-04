import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Mail, FileText, Building2, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BusinessRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const BusinessRequestModal: React.FC<BusinessRequestModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();

  const handleEmailClick = () => {
    window.open(`mailto:spott.business.request@gmail.com?subject=${encodeURIComponent('Business Account Request')}&body=${encodeURIComponent('Hello,\n\nI would like to request a business account for my establishment.\n\nPlease find attached my business documentation and proof of ownership.\n\nThank you.')}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="text-left">
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  {t('businessRequest', { ns: 'settings' })}
                </SheetTitle>
                <SheetDescription>
                  {t('businessRequestDesc', { ns: 'settings' })}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-muted p-4 rounded-lg space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {t('requiredDocuments', { ns: 'settings' })}
            </h3>
            <ul className="text-sm space-y-2 text-muted-foreground pl-6">
              <li className="list-disc">{t('doc1', { ns: 'settings' })}</li>
              <li className="list-disc">{t('doc2', { ns: 'settings' })}</li>
              <li className="list-disc">{t('doc3', { ns: 'settings' })}</li>
            </ul>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-sm text-primary font-medium mb-3">
              {t('sendEmail', { ns: 'settings' })}
            </p>
            <Button 
              onClick={handleEmailClick}
              className="w-full"
              size="lg"
            >
              <Mail className="w-4 h-4 mr-2" />
              spott.business.request@gmail.com
            </Button>
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p>• {t('reviewTime', { ns: 'settings' })}</p>
            <p>• {t('exclusiveAccess', { ns: 'settings' })}</p>
          </div>
        </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BusinessRequestModal;