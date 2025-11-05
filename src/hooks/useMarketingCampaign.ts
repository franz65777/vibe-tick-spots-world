import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MarketingCampaign {
  id: string;
  location_id: string;
  business_user_id: string;
  campaign_type: 'event' | 'discount' | 'promotion' | 'news';
  title: string;
  description: string;
  end_date: string;
  created_at: string;
  is_active: boolean;
}

export const useMarketingCampaign = (locationId: string | undefined) => {
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!locationId) {
        setCampaign(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('marketing_campaigns')
          .select('*')
          .eq('location_id', locationId)
          .eq('is_active', true)
          .gt('end_date', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching marketing campaign:', error);
          setCampaign(null);
        } else {
          setCampaign(data as MarketingCampaign);
        }
      } catch (err) {
        console.error('Error:', err);
        setCampaign(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [locationId]);

  return { campaign, loading };
};
