import React, { useState, useEffect } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { translateCityName } from '@/utils/cityTranslations';
import { LeaderboardMetric } from '@/hooks/useLeaderboardMetrics';

interface CitySelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  onSelectCity: (city: string) => void;
  metric: LeaderboardMetric;
  filter: 'all' | 'following';
}

interface CityData {
  city: string;
  count: number;
}

const CitySelectionModal = ({
  isOpen,
  onClose,
  selectedCity,
  onSelectCity,
  metric,
  filter
}: CitySelectionModalProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchAvailableCities();
    }
  }, [isOpen, metric, filter, user]);

  const fetchAvailableCities = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get all profiles with city data
      let profilesQuery = supabase
        .from('profiles')
        .select('id, current_city')
        .not('current_city', 'is', null);

      // Apply following filter if needed
      if (filter === 'following') {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        
        if (!following || following.length === 0) {
          setCities([]);
          setLoading(false);
          return;
        }

        const followingIds = following.map(f => f.following_id);
        profilesQuery = profilesQuery.in('id', followingIds);
      }

      const { data: profiles } = await profilesQuery;
      if (!profiles || profiles.length === 0) {
        setCities([]);
        setLoading(false);
        return;
      }

      // Count users per city who have data for ANY metric
      const cityCounts: Record<string, Set<string>> = {};
      
      for (const profile of profiles) {
        if (!profile.current_city) continue;
        
        let hasDataAnyMetric = false;
        
        // Check all 4 metrics - user should have data in at least one
        const checks = await Promise.all([
          // Saved (both tables)
          supabase
            .from('user_saved_locations')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .limit(1),
          supabase
            .from('saved_places')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .limit(1),
          // Invited
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('invited_by', profile.id)
            .limit(1),
          // Posts
          supabase
            .from('posts')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .not('location_id', 'is', null)
            .limit(1),
          // Reviews
          supabase
            .from('post_reviews')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .limit(1)
        ]);

        // If user has data in at least one metric
        hasDataAnyMetric = checks.some(check => (check.count || 0) > 0);
        
        if (hasDataAnyMetric) {
          if (!cityCounts[profile.current_city]) {
            cityCounts[profile.current_city] = new Set();
          }
          cityCounts[profile.current_city].add(profile.id);
        }
      }

      // Convert to array and sort
      const cityData: CityData[] = Object.entries(cityCounts)
        .map(([city, userIds]) => ({
          city,
          count: userIds.size
        }))
        .filter(c => c.count > 0)
        .sort((a, b) => b.count - a.count);

      setCities(cityData);
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCities = cities.filter(c => {
    const translatedCity = translateCityName(
      c.city.charAt(0).toUpperCase() + c.city.slice(1).replace('-', ' '),
      i18n.language
    );
    return translatedCity.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-background border-b border-border">
        <div className="flex items-center gap-3 px-4 pt-6 pb-4">
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="rounded-full"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl font-semibold text-foreground">
            {t('selectCity', { ns: 'leaderboard' })}
          </h2>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('searchCity', { ns: 'leaderboard' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Cities List - Remove scrollbar */}
      <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('loading', { ns: 'common' })}</p>
          </div>
        ) : filteredCities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <p className="text-muted-foreground text-center">
              {t('noCitiesAvailable', { ns: 'leaderboard' })}
            </p>
          </div>
        ) : (
          <div className="py-2">
            {/* All Cities Option */}
            <button
              onClick={() => {
                onSelectCity('all');
                onClose();
              }}
              className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                selectedCity === 'all' ? 'bg-muted' : ''
              }`}
            >
              <span className="font-medium text-foreground">
                {t('allCities', { ns: 'leaderboard' })}
              </span>
              {selectedCity === 'all' && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </button>

            {/* Individual Cities */}
            {filteredCities.map((cityData) => {
              const displayName = translateCityName(
                cityData.city.charAt(0).toUpperCase() + cityData.city.slice(1).replace('-', ' '),
                i18n.language
              );
              return (
                <button
                  key={cityData.city}
                  onClick={() => {
                    onSelectCity(cityData.city);
                    onClose();
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                    selectedCity === cityData.city ? 'bg-muted' : ''
                  }`}
                >
                  <span className="font-medium text-foreground capitalize">
                    {displayName}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {cityData.count}
                    </span>
                    {selectedCity === cityData.city && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CitySelectionModal;
