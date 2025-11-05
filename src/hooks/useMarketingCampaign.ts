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

export const useMarketingCampaign = (locationId?: string, googlePlaceId?: string) => {
  const [campaign, setCampaign] = useState<MarketingCampaign | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!locationId && !googlePlaceId) {
        setCampaign(null);
        return;
      }

      setLoading(true);
      try {
        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
        let resolvedLocationId: string | undefined = locationId;

        // If we don't have a valid UUID, try resolving via google_place_id
        if ((!resolvedLocationId || !isUuid(resolvedLocationId)) && googlePlaceId) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', googlePlaceId)
            .maybeSingle();
          if (locationData?.id) resolvedLocationId = locationData.id;
        }

        // Fallback: if locationId looks like a google_place_id, resolve it
        if (resolvedLocationId && !isUuid(resolvedLocationId)) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('id')
            .eq('google_place_id', resolvedLocationId)
            .maybeSingle();
          if (locationData?.id) resolvedLocationId = locationData.id; else resolvedLocationId = undefined;
        }

        if (!resolvedLocationId) {
          setCampaign(null);
          return;
        }

        const { data, error } = await supabase
          .from('marketing_campaigns')
          .select('*')
          .eq('location_id', resolvedLocationId)
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
  }, [locationId, googlePlaceId]);

  return { campaign, loading };
};
