import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Users, ChevronDown, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { cn } from '@/lib/utils';
import fireIcon from '@/assets/fire-icon-3d.png';
import trendingIcon from '@/assets/filter-trending.png';
import discountIcon from '@/assets/filter-discount.png';
import eventIcon from '@/assets/filter-event.png';
import promotionIcon from '@/assets/filter-promotion.png';
import newIcon from '@/assets/filter-new.png';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
  campaign?: {
    id: string;
    type: string;
    registrationsCount: number;
    userRegistered?: boolean;
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
          .select('id, location_id, campaign_type, end_date')
          .eq('campaign_type', campaignTypeMap[filterType])
          .eq('is_active', true)
          .gte('end_date', new Date().toISOString())
          .in('location_id', locationIds);

        campaignsData?.forEach(campaign => {
          campaignsMap.set(campaign.location_id, campaign);
        });
      }

      // Get event registrations if filter is event
      let registrationsMap = new Map<string, { count: number; userRegistered: boolean }>();
      if (filterType === 'event' && campaignsMap.size > 0) {
        const campaignIds = Array.from(campaignsMap.values()).map(c => c.id);
        
        const { data: registrationsData } = await supabase
          .from('event_registrations')
          .select('campaign_id, user_id')
          .in('campaign_id', campaignIds);

        registrationsData?.forEach(reg => {
          const current = registrationsMap.get(reg.campaign_id) || { count: 0, userRegistered: false };
          registrationsMap.set(reg.campaign_id, {
            count: current.count + 1,
            userRegistered: current.userRegistered || (user && reg.user_id === user.id)
          });
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
          const campaign = campaignsMap.get(location.id);
          const registrations = campaign ? registrationsMap.get(campaign.id) : undefined;

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
              },
              campaign: campaign ? {
                id: campaign.id,
                type: campaign.campaign_type,
                registrationsCount: registrations?.count || 0,
                userRegistered: registrations?.userRegistered || false
              } : undefined
            });
          }
        }
      });

      // Sort by registrations count if event filter, otherwise by saves count
      const topSpots = Array.from(locationMap.values())
        .sort((a, b) => {
          if (filterType === 'event' && a.campaign && b.campaign) {
            return b.campaign.registrationsCount - a.campaign.registrationsCount;
          }
          return b.savesCount - a.savesCount;
        })
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

  const handleEventRegistration = async (e: React.MouseEvent, spot: PopularSpot) => {
    e.stopPropagation();
    
    if (!user) {
      toast.error('Please log in to register for events');
      return;
    }

    if (!spot.campaign) return;

    try {
      if (spot.campaign.userRegistered) {
        // Unregister
        const { error } = await supabase
          .from('event_registrations')
          .delete()
          .eq('user_id', user.id)
          .eq('campaign_id', spot.campaign.id);

        if (error) throw error;
        toast.success('Registration cancelled');
      } else {
        // Register
        const { error } = await supabase
          .from('event_registrations')
          .insert({
            user_id: user.id,
            campaign_id: spot.campaign.id,
            location_id: spot.id
          });

        if (error) throw error;
        toast.success('Registered for event!');
      }
      
      // Refresh spots
      fetchPopularSpots();
    } catch (error) {
      console.error('Error handling event registration:', error);
      toast.error('Failed to update registration');
    }
  };

const getFilterIcon = () => {
    switch (filterType) {
      case 'discount': return <img src={discountIcon} alt="Discount" className="w-5 h-5 object-contain" />;
      case 'event': return <img src={eventIcon} alt="Event" className="w-5 h-5 object-contain" />;
      case 'promotion': return <img src={promotionIcon} alt="Promotion" className="w-5 h-5 object-contain" />;
      case 'new': return <img src={newIcon} alt="New" className="w-5 h-5 object-contain" />;
      default: return <img src={trendingIcon} alt="Trending" className="w-5 h-5 object-contain" />;
    }
  };

  const getFilterLabel = () => {
    switch (filterType) {
      case 'discount': return t('filters.discount', { ns: 'home' });
      case 'event': return t('filters.event', { ns: 'home' });
      case 'promotion': return t('filters.promotion', { ns: 'home' });
      case 'new': return t('filters.new', { ns: 'home' });
      default: return t('filters.trending', { ns: 'home' });
    }
  };

  const filterOptions = [
    { value: 'most_saved' as FilterType, label: t('filters.trending', { ns: 'home' }), icon: trendingIcon },
    { value: 'discount' as FilterType, label: t('filters.discount', { ns: 'home' }), icon: discountIcon },
    { value: 'event' as FilterType, label: t('filters.event', { ns: 'home' }), icon: eventIcon },
    { value: 'promotion' as FilterType, label: t('filters.promotion', { ns: 'home' }), icon: promotionIcon },
    { value: 'new' as FilterType, label: t('filters.new', { ns: 'home' }), icon: newIcon },
  ];

  const selectedFilter = filterType;

  return (
    <div className="h-full px-[10px] py-1 bg-background/50">
      {/* Filter Options */}
      <div className="relative mb-1">
        <div className="absolute inset-0 bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md rounded-lg border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude]"></div>
        <div className="relative flex gap-3 overflow-x-auto scrollbar-hide px-3 py-2">
          {filterOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setFilterType(option.value)}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-all flex-shrink-0",
                selectedFilter === option.value ? "opacity-100" : "opacity-70 hover:opacity-90"
              )}
            >
              <img 
                src={option.icon} 
                alt="" 
                className="w-12 h-12 object-contain" 
              />
              <span className={cn(
                "text-[10px] font-medium whitespace-nowrap",
                selectedFilter === option.value ? "text-primary" : "text-muted-foreground"
              )}>
                {option.label}
              </span>
            </button>
          ))}
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
            <div key={spot.id} className="flex-shrink-0 flex flex-col gap-1">
              <button
                onClick={() => handleSpotClick(spot)}
                className="relative px-3 py-2 rounded-lg bg-gray-200/40 dark:bg-slate-800/65 backdrop-blur-md hover:bg-muted/20 flex items-center gap-2 transition-all hover:shadow-md overflow-hidden"
                aria-label={`Zoom to ${spot.name}`}
              >
                <div className="absolute inset-0 rounded-lg border-[1.5px] border-transparent [background:linear-gradient(135deg,hsl(var(--primary)/0.6),hsl(var(--primary)/0.2))_border-box] [background-clip:border-box] [-webkit-mask:linear-gradient(#fff_0_0)_padding-box,linear-gradient(#fff_0_0)] [-webkit-mask-composite:xor] [mask-composite:exclude] pointer-events-none"></div>
                <CategoryIcon category={spot.category} className="w-5 h-5" />
                <span className="text-xs font-medium text-foreground line-clamp-1 max-w-[160px]">
                  {spot.name}
                </span>
              </button>
              
              {/* Event registration button */}
              {spot.campaign?.type === 'event' && (
                <button
                  onClick={(e) => handleEventRegistration(e, spot)}
                  className={`px-2 py-1 rounded-md text-[10px] font-medium flex items-center justify-center gap-1 transition-all ${
                    spot.campaign.userRegistered
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  <UserPlus className="w-3 h-3" />
                  {spot.campaign.userRegistered ? 'Registered' : 'Register'}
                  {spot.campaign.registrationsCount > 0 && (
                    <span className="ml-1">({spot.campaign.registrationsCount})</span>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t('noPopularSpots', { ns: 'home' })} {currentCity || t('thisArea', { ns: 'common' })}
        </p>
      )}
    </div>
  );
};

export default PopularSpots;
