import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Percent, Megaphone, CalendarDays, X, ImagePlus, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface BusinessMarketingCreatorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BusinessMarketingCreator: React.FC<BusinessMarketingCreatorProps> = ({ onSuccess, onCancel }) => {
  type ContentType = 'event' | 'discount' | 'promotion' | 'announcement';

  const { t } = useTranslation();
  const { user } = useAuth();
  const [contentType, setContentType] = useState<ContentType>('event');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [terms, setTerms] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check for campaign template from feed
  useEffect(() => {
    const template = localStorage.getItem('campaign_template');
    if (template) {
      try {
        const data = JSON.parse(template);
        setDescription(data.description || '');
        setContentType(data.content_type || 'event');
        if (data.metadata) {
          setStartDate(data.metadata.start_date || '');
          setEndDate(data.metadata.end_date || '');
          setDiscountAmount(data.metadata.discount_amount || '');
        setTerms(data.metadata.terms || '');
        }
        localStorage.removeItem('campaign_template');
        toast.success(t('campaignLoaded', { ns: 'business' }));
      } catch (error) {
        console.error('Error loading template:', error);
      }
    }
  }, []);

  const contentTypes = [
    { value: 'event' as ContentType, label: t('event', { ns: 'business' }), icon: CalendarDays },
    { value: 'discount' as ContentType, label: t('discount', { ns: 'business' }), icon: Percent },
    { value: 'promotion' as ContentType, label: t('promo', { ns: 'business' }), icon: Megaphone },
    { value: 'announcement' as ContentType, label: t('news', { ns: 'business' }), icon: Calendar }
  ];

  const handleFilesSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => file.type.startsWith('image/'));
    const newFiles = validFiles.slice(0, 3 - selectedFiles.length);

    if (newFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...newFiles]);
      newFiles.forEach(file => {
        const url = URL.createObjectURL(file);
        setPreviewUrls(prev => [...prev, url]);
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error(t('mustBeLoggedIn', { ns: 'business' }));
      return;
    }

    if (!title.trim()) {
      toast.error(t('provideTitleError', { ns: 'business' }));
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload images if any
      const mediaUrls: string[] = [];
      for (const file of selectedFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `marketing/${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
      }

      // Create metadata object
      const metadata: any = {};
      if (startDate) metadata.start_date = startDate;
      if (endDate) metadata.end_date = endDate;
      if (discountAmount) metadata.discount_amount = discountAmount;
      if (terms) metadata.terms = terms;

      // Get business profile first to get location_id
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!businessProfile) {
        toast.error(t('businessProfileNotFound', { ns: 'business' }));
        return;
      }

      // Get claimed location
      const { data: locationClaim } = await supabase
        .from('location_claims')
        .select('location_id')
        .eq('business_id', businessProfile.id)
        .eq('verification_status', 'verified')
        .limit(1)
        .maybeSingle();

      // Insert marketing post
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          location_id: locationClaim?.location_id || null,
          caption: `${title}\n\n${description}`,
          content_type: contentType,
          media_urls: mediaUrls,
          metadata
        });

      if (error) throw error;

      toast.success(t('campaignPublished', { ns: 'business' }));

      // Reset form
      setTitle('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setDiscountAmount('');
      setTerms('');
      setSelectedFiles([]);
      setPreviewUrls([]);

      onSuccess?.();
    } catch (error) {
      console.error('Error creating marketing content:', error);
      toast.error(t('failedCreateContent', { ns: 'business' }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col space-y-3">
      {/* Content Type Selection - 2 rows */}
      <div className="grid grid-cols-2 gap-2">
        {contentTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setContentType(type.value)}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-base",
              contentType === type.value
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <type.icon className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-left truncate">{type.label}</span>
          </button>
        ))}
      </div>

      {/* Form Fields - Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <div className="space-y-3 pb-4">
          {/* Image Upload - Moved to top */}
          <div className="flex-shrink-0">
            <label className="text-sm font-medium mb-2 block">{t('imagesUpTo3', { ns: 'business' })}</label>
            <div className="space-y-2">
              {selectedFiles.length < 3 && (
                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  <span className="text-sm">{t('addImages', { ns: 'business' })}</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
                    className="hidden"
                  />
                </label>
              )}

              {/* Preview Images */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveFile(index)}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="flex-shrink-0">
            <label className="text-base font-medium mb-1 block">{t('title', { ns: 'business' })}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`${t(contentType, { ns: 'business' })} ${t('titlePlaceholder', { ns: 'business' })}`}
              className="h-10 text-base"
            />
          </div>

          {/* Description */}
          <div className="flex-shrink-0">
            <label className="text-base font-medium mb-1 block">{t('description', { ns: 'business' })}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={`${t('descriptionPlaceholder', { ns: 'business' })} ${t(contentType, { ns: 'business' })}...`}
              className="min-h-[56px] text-base resize-none"
              rows={2}
            />
          </div>

          {/* Conditional Fields */}
          {contentType === 'event' && (
            <div className="space-y-2 flex-shrink-0">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('start', { ns: 'business' })}</label>
                <Input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-11 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">{t('end', { ns: 'business' })}</label>
                <Input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-11 text-sm"
                />
              </div>
            </div>
          )}

        {contentType === 'discount' && (
          <div className="flex-shrink-0">
            <label className="text-base font-medium mb-1 block">{t('discountPercent', { ns: 'business' })}</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder={t('discountPlaceholder', { ns: 'business' })}
              className="h-10 text-base"
            />
          </div>
        )}

          {(contentType === 'discount' || contentType === 'promotion') && (
            <div className="flex-shrink-0">
              <label className="text-base font-medium mb-1 block">{t('terms', { ns: 'business' })}</label>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder={t('termsPlaceholder', { ns: 'business' })}
                className="min-h-[50px] text-base resize-none"
                rows={2}
              />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex-shrink-0 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className="w-full h-11 text-sm rounded-xl"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('publishing', { ns: 'business' })}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t('publishCampaign', { ns: 'business' })}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BusinessMarketingCreator;
