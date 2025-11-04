import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mail, FileText, Building2 } from 'lucide-react';
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            {t('businessRequest', { ns: 'settings' })}
          </DialogTitle>
          <DialogDescription>
            {t('businessRequestDesc', { ns: 'settings' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
      </DialogContent>
    </Dialog>
  );
};

export default BusinessRequestModal;