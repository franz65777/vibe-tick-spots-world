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
        mk('first-post', 'First Post', 'Create your first post', '📸', postsCount >= 1, postsCount, 1),
        mk('content-creator', 'Content Creator', 'Share 10 posts', '🎨', postsCount >= 10, postsCount, 10),
        mk('social-star', 'Social Star', 'Share 50 posts', '⭐', postsCount >= 50, postsCount, 50),
        mk('content-master', 'Content Master', 'Share 100 posts', '👑', postsCount >= 100, postsCount, 100),

        // Engagement
        mk('popular-spot', 'Popular Spot', 'Get 50 saves', '❤️', savesCount >= 50, savesCount, 50),
        mk('community-favorite', 'Community Favorite', 'Get 100 saves', '🌟', savesCount >= 100, savesCount, 100),
        mk('local-legend', 'Local Legend', 'Get 500 saves', '🏆', savesCount >= 500, savesCount, 500),
        mk('trending-now', 'Trending Now', 'Get 100 shares', '🔥', sharesCount >= 100, sharesCount, 100),

        // Marketing & Promotions
        mk('first-campaign', 'First Campaign', 'Send your first notification', '📢', notificationsCount >= 1, notificationsCount, 1),
        mk('marketing-pro', 'Marketing Pro', 'Send 10 notifications', '📊', notificationsCount >= 10, notificationsCount, 10),
        mk('promotion-expert', 'Promotion Expert', 'Send 25 notifications', '🎯', notificationsCount >= 25, notificationsCount, 25),

        // Events & Deals (from posts)
        mk('event-host', 'Event Host', 'Create your first event', '🎉', eventsCount >= 1, eventsCount, 1),
        mk('festival-organizer', 'Festival Organizer', 'Create 5 events', '🎪', eventsCount >= 5, eventsCount, 5),
        mk('special-deals', 'Special Deals', 'Create your first discount', '🎁', discountsCount >= 1, discountsCount, 1),
        mk('deal-master', 'Deal Master', 'Create 10 discounts', '💰', discountsCount >= 10, discountsCount, 10),
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
    name: t(nameKey as any, { ns: 'business', defaultValue: nameKey }),
    description: t(descKey as any, { ns: 'business', defaultValue: descKey }),
    icon,
    earned,
    progress,
    max,
  });

  return { loading, badges };
};
