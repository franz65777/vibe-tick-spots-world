import React, { useState } from 'react';
import { X, Building2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface BusinessClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationId?: string;
  locationName?: string;
}

const BusinessClaimModal = ({ isOpen, onClose, locationId, locationName }: BusinessClaimModalProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: locationName || '',
    businessType: '',
    description: '',
    contactEmail: user?.email || '',
    contactPhone: '',
    documents: null as File | null
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      // Create business claim request
      const { error } = await supabase
        .from('business_claim_requests')
        .insert({
          user_id: user.id,
          location_id: locationId,
          business_name: formData.businessName,
          business_type: formData.businessType,
          description: formData.description,
          contact_email: formData.contactEmail,
          contact_phone: formData.contactPhone,
          status: 'pending'
        });

      if (error) throw error;

      toast.success(t('requestSentSuccess', { ns: 'business' }), {
        description: t('requestSentDescription', { ns: 'business' })
      });
      
      onClose();
    } catch (error) {
      console.error('Error submitting claim:', error);
      toast.error(t('errorSendingRequest', { ns: 'business' }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center pt-[env(safe-area-inset-top)]">
      <div className="bg-background w-full max-w-md max-h-[90vh] sm:rounded-3xl rounded-t-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-full">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-xl">{t('requestBusinessAccount', { ns: 'business' })}</h3>
              <p className="text-white/80 text-sm">{t('manageYourBusiness', { ns: 'business' })}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div>
            <Label htmlFor="businessName">{t('businessName', { ns: 'business' })} *</Label>
            <Input
              id="businessName"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              required
              placeholder={t('businessNamePlaceholder', { ns: 'business' })}
            />
          </div>

          <div>
            <Label htmlFor="businessType">{t('businessType', { ns: 'business' })} *</Label>
            <Input
              id="businessType"
              value={formData.businessType}
              onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
              required
              placeholder={t('businessTypePlaceholder', { ns: 'business' })}
            />
          </div>

          <div>
            <Label htmlFor="description">{t('description', { ns: 'business' })}</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('descriptionPlaceholder', { ns: 'business' })}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="contactEmail">{t('contactEmail', { ns: 'business' })} *</Label>
            <Input
              id="contactEmail"
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="contactPhone">{t('contactPhone', { ns: 'business' })}</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={formData.contactPhone}
              onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
              placeholder="+39 123 456 7890"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-950/30 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>{t('note', { ns: 'common' })}:</strong> {t('businessRequestNote', { ns: 'business' })}
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? t('sending', { ns: 'common' }) : t('sendRequest', { ns: 'business' })}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default BusinessClaimModal;