import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Calendar, Upload, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CampaignData {
  id: string;
  caption: string;
  media_urls: string[];
  content_type: string;
  metadata: any;
}

const BusinessEditCampaignPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [caption, setCaption] = useState('');
  const [contentType, setContentType] = useState('event');
  const [endDate, setEndDate] = useState('');
  const [discount, setDiscount] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);

  useEffect(() => {
    if (campaignId) {
      fetchCampaign();
    }
  }, [campaignId]);

  const fetchCampaign = async () => {
    if (!campaignId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', campaignId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (data) {
        setCampaign(data);
        setCaption(data.caption || '');
        setContentType(data.content_type || 'event');
        const meta = data.metadata as any;
        setEndDate(meta?.end_date || '');
        setDiscount(meta?.discount || '');
        setExistingImages(data.media_urls || []);
      }
    } catch (error) {
      console.error('Error fetching campaign:', error);
      toast.error(t('failedToLoadCampaign', { ns: 'business' }));
      navigate('/business/profile');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!campaign || !caption.trim()) {
      toast.error(t('fillRequiredFields', { ns: 'business' }));
      return;
    }

    try {
      setSaving(true);

      const metadata = {
        ...campaign.metadata,
        end_date: endDate || undefined,
        discount: discount || undefined,
      };

      // Update the post
      const { error: postError } = await supabase
        .from('posts')
        .update({
          caption,
          content_type: contentType,
          media_urls: existingImages,
          metadata,
        })
        .eq('id', campaign.id);

      if (postError) throw postError;

      // Update marketing_campaign if exists
      if (metadata.campaign_id) {
        const { error: campaignError } = await supabase
          .from('marketing_campaigns')
          .update({
            title: caption,
            campaign_type: contentType,
            end_date: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            description: caption,
            metadata,
          })
          .eq('id', metadata.campaign_id);

        if (campaignError) {
          console.error('Error updating marketing campaign:', campaignError);
        }
      }

      toast.success(t('campaignUpdated', { ns: 'business' }));
      navigate('/business/profile');
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error(t('failedToUpdateCampaign', { ns: 'business' }));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">{t('campaignNotFound', { ns: 'business' })}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-screen-sm mx-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/business/profile')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground flex-1">
            {t('editCampaign', { ns: 'business' })}
          </h1>
          <Button
            onClick={handleSave}
            disabled={saving || !caption.trim()}
          >
            {saving ? t('saving', { ns: 'common' }) : t('save', { ns: 'common' })}
          </Button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-4">
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{t('images', { ns: 'common' })}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  {existingImages.map((url, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={url}
                        alt={`Campaign image ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => handleRemoveImage(index)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Campaign Type */}
          <div className="space-y-2">
            <Label htmlFor="content-type">{t('campaignType', { ns: 'business' })}</Label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger id="content-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="event">{t('event', { ns: 'business' })}</SelectItem>
                <SelectItem value="discount">{t('discount', { ns: 'business' })}</SelectItem>
                <SelectItem value="promotion">{t('promotion', { ns: 'business' })}</SelectItem>
                <SelectItem value="announcement">{t('announcement', { ns: 'business' })}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <Label htmlFor="caption">{t('description', { ns: 'common' })} *</Label>
            <Textarea
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('enterCampaignDescription', { ns: 'business' })}
              rows={4}
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="end-date">
              <Calendar className="w-4 h-4 inline mr-2" />
              {t('endDate', { ns: 'business' })}
            </Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {/* Discount (if applicable) */}
          {contentType === 'discount' && (
            <div className="space-y-2">
              <Label htmlFor="discount">{t('discountAmount', { ns: 'business' })}</Label>
              <Input
                id="discount"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                placeholder="e.g., 20% off, €10 off"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessEditCampaignPage;
