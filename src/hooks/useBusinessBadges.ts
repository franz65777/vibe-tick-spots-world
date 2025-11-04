import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

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

      // Saves for this location
      let savesCount = 0;
      if (locationId) {
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

      const items: BusinessBadgeItem[] = [
        // Content & Posts
        mk('first-post', 'businessBadges.firstPost', 'businessBadges.firstPostDesc', '📸', postsCount >= 1, postsCount, 1),
        mk('content-creator', 'businessBadges.contentCreator', 'businessBadges.contentCreatorDesc', '🎨', postsCount >= 10, postsCount, 10),
        mk('social-star', 'businessBadges.socialStar', 'businessBadges.socialStarDesc', '⭐', postsCount >= 50, postsCount, 50),
        mk('content-master', 'businessBadges.contentMaster', 'businessBadges.contentMasterDesc', '👑', postsCount >= 100, postsCount, 100),

        // Engagement
        mk('popular-spot', 'businessBadges.popularSpot', 'businessBadges.popularSpotDesc', '❤️', savesCount >= 50, savesCount, 50),
        mk('community-favorite', 'businessBadges.communityFavorite', 'businessBadges.communityFavoriteDesc', '🌟', savesCount >= 100, savesCount, 100),
        mk('local-legend', 'businessBadges.localLegend', 'businessBadges.localLegendDesc', '🏆', savesCount >= 500, savesCount, 500),
        mk('trending-now', 'businessBadges.trendingNow', 'businessBadges.trendingNowDesc', '🔥', sharesCount >= 100, sharesCount, 100),

        // Marketing & Promotions
        mk('first-campaign', 'businessBadges.firstCampaign', 'businessBadges.firstCampaignDesc', '📢', notificationsCount >= 1, notificationsCount, 1),
        mk('marketing-pro', 'businessBadges.marketingPro', 'businessBadges.marketingProDesc', '📊', notificationsCount >= 10, notificationsCount, 10),
        mk('promotion-expert', 'businessBadges.promotionExpert', 'businessBadges.promotionExpertDesc', '🎯', notificationsCount >= 25, notificationsCount, 25),

        // Events & Deals (from posts)
        mk('event-host', 'businessBadges.eventHost', 'businessBadges.eventHostDesc', '🎉', eventsCount >= 1, eventsCount, 1),
        mk('festival-organizer', 'businessBadges.festivalOrganizer', 'businessBadges.festivalOrganizerDesc', '🎪', eventsCount >= 5, eventsCount, 5),
        mk('special-deals', 'businessBadges.specialDeals', 'businessBadges.specialDealsDesc', '🎁', discountsCount >= 1, discountsCount, 1),
        mk('deal-master', 'businessBadges.dealMaster', 'businessBadges.dealMasterDesc', '💰', discountsCount >= 10, discountsCount, 10),
      ];

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
  ): BusinessBadgeItem => ({
    id,
    name: t(nameKey as any, { defaultValue: nameKey }),
    description: t(descKey as any, { defaultValue: descKey }),
    icon,
    earned,
    progress,
    max,
  });

  return { loading, badges };
};
