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
        .from('business_marketing_content')
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
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Create Marketing Content</h2>
        <p className="text-muted-foreground">
          Share events, promotions, and announcements with your customers
        </p>
      </div>

      {/* Content Type Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {contentTypes.map((ct) => {
          const Icon = ct.icon;
          return (
            <button
              key={ct.value}
              onClick={() => setType(ct.value as ContentType)}
              className={`p-4 rounded-xl border-2 transition-all ${
                type === ct.value
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${type === ct.value ? 'text-blue-600' : 'text-gray-600'}`} />
              <p className={`text-sm font-medium ${type === ct.value ? 'text-blue-600' : 'text-gray-700'}`}>
                {ct.label}
              </p>
            </button>
          );
        })}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={`Enter ${type} title...`}
          maxLength={100}
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your offering in detail..."
          rows={4}
          maxLength={500}
        />
      </div>

      {/* Dates - for events and time-limited promotions */}
      {(type === 'event' || type === 'promotion' || type === 'discount') && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Discount Amount - only for discounts */}
      {type === 'discount' && (
        <div className="space-y-2">
          <Label htmlFor="discountAmount">Discount Amount</Label>
          <Input
            id="discountAmount"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(e.target.value)}
            placeholder="e.g., 20% off or $10 off"
          />
        </div>
      )}

      {/* Terms */}
      <div className="space-y-2">
        <Label htmlFor="terms">Terms & Conditions</Label>
        <Textarea
          id="terms"
          value={terms}
          onChange={(e) => setTerms(e.target.value)}
          placeholder="Enter any terms and conditions..."
          rows={3}
        />
      </div>

      {/* Media Upload */}
      <div className="space-y-2">
        <Label>Images (up to 3)</Label>
        <div className="space-y-3">
          {previewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {previewUrls.map((url, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveFile(index)}
                    className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {selectedFiles.length < 3 && (
            <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-600">Click to upload images</span>
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

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim()}
          className="flex-1"
        >
          {isSubmitting ? 'Creating...' : 'Create Content'}
        </Button>
        {onCancel && (
          <Button onClick={onCancel} variant="outline">
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default BusinessMarketingCreator;
