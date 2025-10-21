import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Percent, Megaphone, CalendarDays, X, ImagePlus, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface BusinessMarketingCreatorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const BusinessMarketingCreator: React.FC<BusinessMarketingCreatorProps> = ({ onSuccess, onCancel }) => {
  type ContentType = 'event' | 'discount' | 'promotion' | 'announcement';

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
        toast.success('Campaign template loaded! Customize and publish.');
      } catch (error) {
        console.error('Error loading template:', error);
      }
    }
  }, []);

  const contentTypes = [
    { value: 'event' as ContentType, label: 'Event', icon: CalendarDays },
    { value: 'discount' as ContentType, label: 'Discount', icon: Percent },
    { value: 'promotion' as ContentType, label: 'Promo', icon: Megaphone },
    { value: 'announcement' as ContentType, label: 'News', icon: Calendar }
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
      toast.error('You must be logged in');
      return;
    }

    if (!title.trim()) {
      toast.error('Please provide a title');
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
        toast.error('Business profile not found');
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

      toast.success('Marketing campaign published!');

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
      toast.error('Failed to create content');
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

      {/* Form Fields - No scroll */}
      <div className="flex-1 min-h-0 space-y-3 overflow-hidden flex flex-col">
        {/* Title */}
        <div className="flex-shrink-0">
          <label className="text-base font-medium mb-1 block">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${contentType} title...`}
            className="h-10 text-base"
          />
        </div>

        {/* Description */}
        <div className="flex-shrink-0">
          <label className="text-base font-medium mb-1 block">Description</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={`Describe your ${contentType}...`}
            className="min-h-[56px] text-base resize-none"
            rows={2}
          />
        </div>

        {/* Conditional Fields */}
        {contentType === 'event' && (
          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            <div>
              <label className="text-base font-medium mb-1 block">Start</label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 text-base"
              />
            </div>
            <div>
              <label className="text-base font-medium mb-1 block">End</label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 text-base"
              />
            </div>
          </div>
        )}

        {contentType === 'discount' && (
          <div className="flex-shrink-0">
            <label className="text-base font-medium mb-1 block">Discount (%)</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="e.g., 20"
              className="h-10 text-base"
            />
          </div>
        )}

        {(contentType === 'discount' || contentType === 'promotion') && (
          <div className="flex-shrink-0">
            <label className="text-base font-medium mb-1 block">Terms</label>
            <Textarea
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder="Terms & conditions..."
              className="min-h-[50px] text-base resize-none"
              rows={2}
            />
          </div>
        )}

        {/* Image Upload */}
        <div className="flex-1 min-h-0 flex flex-col">
          <label className="text-sm font-medium mb-1 block">Images (up to 3)</label>
          <div className="space-y-2 flex-1 min-h-0">
            {selectedFiles.length < 3 && (
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors">
                <ImagePlus className="w-4 h-4" />
                <span className="text-sm">Add Images</span>
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

          {/* Submit Button - placed right below images */}
          <div className="flex-shrink-0 pt-3">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !title.trim()}
              className="w-full h-10 text-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Publish Campaign
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
