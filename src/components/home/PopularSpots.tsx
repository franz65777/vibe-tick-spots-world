import React, { useState, useEffect, useRef } from 'react';
import { TrendingUp, MapPin, Users, ChevronDown, Percent, Calendar, Megaphone, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import fireIcon from '@/assets/fire-icon.png';
import { useTranslation } from 'react-i18next';

type FilterType = 'most_saved' | 'discount' | 'event' | 'promotion' | 'new';

interface PopularSpot {
  id: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  google_place_id?: string;
  savesCount: number;
  coverImage?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

interface PopularSpotsProps {
  currentCity?: string;
  onLocationClick?: (coords: { lat: number; lng: number }) => void;
  onSwipeDiscoveryOpen?: () => void;
  onSpotSelect?: (spot: PopularSpot) => void;
}

const PopularSpots = ({ currentCity, onLocationClick, onSwipeDiscoveryOpen, onSpotSelect }: PopularSpotsProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [popularSpots, setPopularSpots] = useState<PopularSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<FilterType>('most_saved');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchPopularSpots();
  }, [currentCity, filterType]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPopularSpots = async () => {
    if (!currentCity || currentCity === 'Unknown City') {
      setPopularSpots([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const normalizedCity = currentCity.trim().toLowerCase();

      // Base query for locations
      const locationsQuery = supabase
        .from('locations')
        .select('id, name, category, city, address, google_place_id, latitude, longitude')
        .or(`city.ilike.%${normalizedCity}%,address.ilike.%${normalizedCity}%`)
        .limit(200);

      const locationsResult = await locationsQuery;
      if (locationsResult.error) throw locationsResult.error;

      const locationsData = locationsResult.data || [];
      const locationIds = locationsData.map(l => l.id);

      // If filter is not "most_saved", get active marketing campaigns
      let campaignsMap = new Map<string, any>();
      if (filterType !== 'most_saved') {
        const campaignTypeMap = {
          'discount': 'discount',
          'event': 'event',
          'promotion': 'promo',
          'new': 'new_opening'
        };

        const { data: campaignsData } = await supabase
          .from('marketing_campaigns')
          .select('location_id, campaign_type, end_date')
          .eq('campaign_type', campaignTypeMap[filterType])
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .in('location_id', locationIds);

        campaignsData?.forEach(campaign => {
          campaignsMap.set(campaign.location_id, campaign);
        });
      }

      // Get saves count for locations
      const { data: savesData } = await supabase
        .from('user_saved_locations')
        .select('location_id')
        .in('location_id', locationIds);

      const savesMap = new Map<string, number>();
      savesData?.forEach(save => {
        savesMap.set(save.location_id, (savesMap.get(save.location_id) || 0) + 1);
      });

      // Get Google saves
      const { data: googleSavesData } = await supabase
        .from('saved_places')
        .select('place_id')
        .ilike('city', `%${normalizedCity}%`);

      const googleSavesMap = new Map<string, number>();
      googleSavesData?.forEach(save => {
        googleSavesMap.set(save.place_id, (googleSavesMap.get(save.place_id) || 0) + 1);
      });

      // Process and filter locations
      const locationMap = new Map<string, PopularSpot>();

      locationsData?.forEach((location) => {
        const locationCity = location.city?.trim().toLowerCase();
        
        // Filter by city
        if (!locationCity || (!locationCity.includes(normalizedCity) && !normalizedCity.includes(locationCity))) {
          return;
        }

        // If filter is not "most_saved", only include locations with active campaigns
        if (filterType !== 'most_saved' && !campaignsMap.has(location.id)) {
          return;
        }

        const key = location.google_place_id || location.id;
        const savesCount = (savesMap.get(location.id) || 0) + (location.google_place_id ? (googleSavesMap.get(location.google_place_id) || 0) : 0);
        
        // Only include locations with at least 1 save or with active campaign
        if (savesCount > 0 || campaignsMap.has(location.id)) {
          if (!locationMap.has(key) || (locationMap.get(key)?.savesCount || 0) < savesCount) {
            locationMap.set(key, {
              id: location.id,
              name: location.name,
              category: location.category,
              city: location.city || 'Unknown',
              address: location.address,
              google_place_id: location.google_place_id,
              savesCount,
              coordinates: {
                lat: parseFloat(location.latitude?.toString() || '0'),
                lng: parseFloat(location.longitude?.toString() || '0')
              }
            });
          }
        }
      });

      // Sort by saves count and get top 10
      const topSpots = Array.from(locationMap.values())
        .sort((a, b) => b.savesCount - a.savesCount)
        .slice(0, 10);

      setPopularSpots(topSpots);
    } catch (error) {
      console.error('Error fetching popular spots:', error);
      setPopularSpots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotClick = (spot: PopularSpot) => {
    onLocationClick?.(spot.coordinates);
    onSpotSelect?.(spot);
  };

  const getFilterIcon = () => {
    switch (filterType) {
      case 'discount': return <Percent className="w-4 h-4 text-white" />;
      case 'event': return <Calendar className="w-4 h-4 text-white" />;
      case 'promotion': return <Megaphone className="w-4 h-4 text-white" />;
      case 'new': return <Sparkles className="w-4 h-4 text-white" />;
      default: return <TrendingUp className="w-4 h-4 text-white" />;
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'discount': return 'Con uno sconto';
      case 'event': return 'Con un evento';
      case 'promotion': return 'Promozione';
      case 'new': return 'Novità';
      default: return 'Più salvate';
    }
  };

  const filterOptions = [
    { type: 'most_saved' as FilterType, label: 'Più salvate', icon: TrendingUp },
    { type: 'discount' as FilterType, label: 'Con uno sconto', icon: Percent },
    { type: 'event' as FilterType, label: 'Con un evento', icon: Calendar },
    { type: 'promotion' as FilterType, label: 'Promozione', icon: Megaphone },
    { type: 'new' as FilterType, label: 'Novità', icon: Sparkles },
  ];

  return (
    <div className="h-full px-1 py-2 bg-white/50">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="relative flex items-center gap-1.5" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-8 h-8 bg-gradient-to-br from-orange-500 to-pink-500 rounded-lg flex items-center justify-center shadow-sm hover:shadow-md transition-shadow flex-shrink-0"
          >
            {getFilterIcon()}
          </button>
          
          {dropdownOpen && (
            <div className="absolute top-10 left-0 bg-white rounded-xl shadow-xl border border-gray-200 p-2 z-50 flex gap-1.5">
              {filterOptions.map((option) => {
                const Icon = option.icon;
                const isActive = filterType === option.type;
                return (
                  <button
                    key={option.type}
                    onClick={() => {
                      setFilterType(option.type);
                      setDropdownOpen(false);
                    }}
                    className={`flex-shrink-0 flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all min-w-[60px] ${
                      isActive 
                        ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-md' 
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-white/20' : 'bg-white'
                    }`}>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-700'}`} />
                    </div>
                    <span className="text-[10px] font-medium text-center leading-tight">{option.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Horizontal chips */}
      {loading ? (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-shrink-0 w-40 h-10 rounded-lg bg-gray-200 animate-pulse" />
          ))}
        </div>
      ) : popularSpots.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {popularSpots.map((spot) => (
            <button
              key={spot.id}
              onClick={() => handleSpotClick(spot)}
              className="flex-shrink-0 px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-2 transition-all hover:shadow-md"
              aria-label={`Zoom to ${spot.name}`}
            >
              <CategoryIcon category={spot.category} className="w-5 h-5" />
              <span className="text-xs font-medium text-gray-900 line-clamp-1 max-w-[160px]">
                {spot.name}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500 text-center py-4">
          {t('noPopularSpots', { ns: 'home' })} {currentCity || t('thisArea', { ns: 'common' })}
        </p>
      )}
    </div>
  );
};

export default PopularSpots;
