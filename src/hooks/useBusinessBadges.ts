import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { isValidUUID } from '@/utils/uuidValidation';

export interface BusinessBadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji for now
  earned: boolean;
  progress?: number;
  max?: number;
}

interface UseBusinessBadgesParams {
  locationId?: string | null;
  googlePlaceId?: string | null;
}

export const useBusinessBadges = ({ locationId, googlePlaceId }: UseBusinessBadgesParams) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BusinessBadgeItem[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, locationId, googlePlaceId, i18n.language]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // Posts by this business user
      const { data: posts } = await supabase
        .from('posts')
        .select('id, shares_count, content_type, location_id')
        .eq('user_id', user!.id);

      const postsCount = posts?.length || 0;
      const sharesCount = posts?.reduce((s, p: any) => s + (p.shares_count || 0), 0) || 0;
      const eventsCount = posts?.filter((p: any) => p.content_type === 'event').length || 0;
      const discountsCount = posts?.filter((p: any) => p.content_type === 'discount').length || 0;

      // Saves for this location - only query if locationId is a valid UUID
      let savesCount = 0;
      if (locationId && isValidUUID(locationId)) {
        const { count: internalSaves } = await supabase
          .from('user_saved_locations')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', locationId);
        savesCount += internalSaves || 0;
      }
      if (googlePlaceId) {
        const { count: externalSaves } = await supabase
          .from('saved_places')
          .select('*', { count: 'exact', head: true })
          .eq('place_id', googlePlaceId);
        savesCount += externalSaves || 0;
      }

      // Business profile and notifications count
      let notificationsCount = 0;
      const { data: businessProfile } = await supabase
        .from('business_profiles')
        .select('id')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (businessProfile?.id) {
        const { count } = await supabase
          .from('business_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', businessProfile.id);
        notificationsCount = count || 0;
      }

      const items: BusinessBadgeItem[] = [];

      // 1. Content Badge (progressive)
      if (postsCount >= 50) {
        items.push(mk('content-master', 'contentMaster', 'contentMasterDesc', '👑', true, postsCount, 100));
      } else if (postsCount >= 10) {
        items.push(mk('content-creator', 'contentCreator', 'contentCreatorDesc', '🎨', true, postsCount, 50));
      } else {
        items.push(mk('first-post', 'firstPost', 'firstPostDesc', '📸', postsCount >= 1, postsCount, 10));
      }

      // 2. Engagement Badge (progressive)
      if (savesCount >= 200) {
        items.push(mk('local-legend', 'localLegend', 'localLegendDesc', '🏆', true, savesCount, 500));
      } else if (savesCount >= 50) {
        items.push(mk('popular-spot', 'popularSpot', 'popularSpotDesc', '❤️', true, savesCount, 200));
      } else {
        items.push(mk('popular-spot', 'popularSpot', 'popularSpotDesc', '❤️', false, savesCount, 50));
      }

      // 3. Marketing Badge (progressive)
      if (notificationsCount >= 10) {
        items.push(mk('marketing-pro', 'marketingPro', 'marketingProDesc', '📊', true, notificationsCount, 25));
      } else if (notificationsCount >= 1) {
        items.push(mk('first-campaign', 'firstCampaign', 'firstCampaignDesc', '📢', true, notificationsCount, 10));
      } else {
        items.push(mk('first-campaign', 'firstCampaign', 'firstCampaignDesc', '📢', false, notificationsCount, 1));
      }

      // 4. Events Badge (progressive)
      if (eventsCount >= 5) {
        items.push(mk('festival-organizer', 'festivalOrganizer', 'festivalOrganizerDesc', '🎪', true, eventsCount, 10));
      } else if (eventsCount >= 1) {
        items.push(mk('event-host', 'eventHost', 'eventHostDesc', '🎉', true, eventsCount, 5));
      } else {
        items.push(mk('event-host', 'eventHost', 'eventHostDesc', '🎉', false, eventsCount, 1));
      }

      // 5. Deals Badge (progressive)
      if (discountsCount >= 10) {
        items.push(mk('deal-master', 'dealMaster', 'dealMasterDesc', '💰', true, discountsCount, 25));
      } else if (discountsCount >= 1) {
        items.push(mk('special-deals', 'specialDeals', 'specialDealsDesc', '🎁', true, discountsCount, 10));
      } else {
        items.push(mk('special-deals', 'specialDeals', 'specialDealsDesc', '🎁', false, discountsCount, 1));
      }

      // 6. Viral Badge
      items.push(mk('trending-now', 'trendingNow', 'trendingNowDesc', '🔥', sharesCount >= 100, sharesCount, 100));

      setBadges(items);
    } finally {
      setLoading(false);
    }
  };

  const mk = (
    id: string,
    nameKey: string,
    descKey: string,
    icon: string,
    earned: boolean,
    progress?: number,
    max?: number
  ): BusinessBadgeItem => {
    // Default English translations for fallback
    const defaults: Record<string, string> = {
      firstPost: 'First Post',
      contentCreator: 'Content Creator', 
      contentMaster: 'Content Master',
      popularSpot: 'Popular Spot',
      localLegend: 'Local Legend',
      firstCampaign: 'First Campaign',
      marketingPro: 'Marketing Pro',
      eventHost: 'Event Host',
      festivalOrganizer: 'Festival Organizer',
      specialDeals: 'Special Deals',
      dealMaster: 'Deal Master',
      trendingNow: 'Trending Now',
      firstPostDesc: 'Create your first post',
      contentCreatorDesc: 'Share 10 posts',
      contentMasterDesc: 'Share 50+ posts',
      popularSpotDesc: 'Get 50 saves',
      localLegendDesc: 'Get 200+ saves', 
      firstCampaignDesc: 'Send your first notification',
      marketingProDesc: 'Send 10 notifications',
      eventHostDesc: 'Create your first event',
      festivalOrganizerDesc: 'Create 5+ events',
      specialDealsDesc: 'Create your first discount',
      dealMasterDesc: 'Create 10+ discounts',
      trendingNowDesc: 'Get 100 shares'
    };

    return {
      id,
      name: t(nameKey, { ns: 'business', defaultValue: defaults[nameKey] || nameKey }),
      description: t(descKey, { ns: 'business', defaultValue: defaults[descKey] || descKey }),
      icon,
      earned,
      progress,
      max,
    };
  };

  return { loading, badges };
};
