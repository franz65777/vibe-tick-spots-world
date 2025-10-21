import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Percent, Megaphone, CalendarDays, X, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface BusinessMarketingCreatorProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

type ContentType = 'event' | 'discount' | 'promotion' | 'announcement';

const BusinessMarketingCreator: React.FC<BusinessMarketingCreatorProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuth();
  const [type, setType] = useState<ContentType>('event');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [discountAmount, setDiscountAmount] = useState('');
  const [terms, setTerms] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contentTypes = [
    { value: 'event', label: 'Event', icon: CalendarDays, description: 'Create an event at your location' },
    { value: 'discount', label: 'Discount', icon: Percent, description: 'Offer a special discount' },
    { value: 'promotion', label: 'Promotion', icon: Megaphone, description: 'Promote your business' },
    { value: 'announcement', label: 'Announcement', icon: Calendar, description: 'Make an announcement' }
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
        const fileName = `${user.id}/${Date.now()}-${Math.random()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('business-marketing')
          .upload(fileName, file);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('business-marketing')
          .getPublicUrl(fileName);

        mediaUrls.push(publicUrl);
      }

      // Insert marketing content
      const { error } = await supabase
        .from('posts' as any)
        .insert({
          business_id: user.id,
          type,
          title,
          description,
          media_urls: mediaUrls,
          start_date: startDate || null,
          end_date: endDate || null,
          discount_amount: type === 'discount' ? discountAmount : null,
          terms: terms || null,
          is_active: true
        });

      if (error) throw error;

      toast.success('Marketing content created successfully!');

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

  const selectedContentType = contentTypes.find(ct => ct.value === type);

  return (
    <div className="space-y-3">
      {/* Content Type Selector */}
      <div className="grid grid-cols-4 gap-2">
        {contentTypes.map((ct) => {
          const Icon = ct.icon;
          return (
            <button
              key={ct.value}
              onClick={() => setType(ct.value as ContentType)}
              className={`p-2 rounded-lg border transition-all ${
                type === ct.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:border-muted-foreground/50'
              }`}
            >
              <Icon className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs font-medium">{ct.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3">
        {/* Title */}
        <div className="space-y-1">
          <Label htmlFor="title" className="text-xs">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${type} title`}
            maxLength={100}
            className="h-9 text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label htmlFor="description" className="text-xs">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your offering..."
            rows={2}
            maxLength={500}
            className="text-sm resize-none"
          />
        </div>

        {/* Dates - for events and time-limited promotions */}
        {(type === 'event' || type === 'promotion' || type === 'discount') && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="startDate" className="text-xs">Start Date</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate" className="text-xs">End Date</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        )}

        {/* Discount Amount - only for discounts */}
        {type === 'discount' && (
          <div className="space-y-1">
            <Label htmlFor="discountAmount" className="text-xs">Discount Amount</Label>
            <Input
              id="discountAmount"
              value={discountAmount}
              onChange={(e) => setDiscountAmount(e.target.value)}
              placeholder="e.g., 20% off"
              className="h-9 text-sm"
            />
          </div>
        )}

        {/* Terms */}
        <div className="space-y-1">
          <Label htmlFor="terms" className="text-xs">Terms</Label>
          <Textarea
            id="terms"
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            placeholder="Terms..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>

        {/* Media Upload */}
        <div className="space-y-1">
          <Label className="text-xs">Images (up to 3)</Label>
          <div className="space-y-2">
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {selectedFiles.length < 3 && (
              <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-muted-foreground/50 transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground mb-1" />
                <span className="text-xs text-muted-foreground">Click to upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !title.trim()}
        className="w-full h-9"
        size="sm"
      >
        {isSubmitting ? 'Creating...' : 'Create Content'}
      </Button>
    </div>
  );
};

export default BusinessMarketingCreator;
