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
      // Build optional following list
      let followingIds: string[] = [];
      if (filter === 'following') {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id);
        followingIds = following?.map(f => f.following_id) || [];
        if (followingIds.length === 0) {
          setCities([]);
          setLoading(false);
          return;
        }
      }

      // 1) Saved Google places with explicit city
      const { data: sp } = await supabase
        .from('saved_places')
        .select('city, user_id')
        .not('city', 'is', null)
        .in('user_id', (filter === 'following' ? followingIds : [] as string[]) || undefined);

      // 2) Internal saved locations joined to locations to get city
      const { data: uslWithCity } = await supabase
        .from('user_saved_locations')
        .select('user_id, locations:location_id(city)')
        .in('user_id', (filter === 'following' ? followingIds : [] as string[]) || undefined);

      const cityCounts: Record<string, Set<string>> = {};

      const addCity = (rawCity: string | null | undefined, userId: string | null | undefined) => {
        if (!rawCity || !userId) return;
        const cleaned = (rawCity || '').trim().replace(/\s+\d+$/, '');
        if (!cleaned) return;
        const key = cleaned.toLowerCase();
        if (!cityCounts[key]) cityCounts[key] = new Set();
        cityCounts[key].add(userId);
      };

      (sp || []).forEach(row => addCity(row.city as any, row.user_id as any));
      (uslWithCity || []).forEach((row: any) => addCity(row.locations?.city, row.user_id));

      const cityData: CityData[] = Object.entries(cityCounts)
        .map(([city, userIds]) => ({ city, count: userIds.size }))
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
