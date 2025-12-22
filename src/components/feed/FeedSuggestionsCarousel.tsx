import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bookmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SuggestedLocation {
  id: string;
  name: string;
  category: string;
  city: string | null;
  image_url: string | null;
  latitude: number;
  longitude: number;
  save_count: number;
  saved_by: Array<{ avatar_url: string | null; username: string }>;
}

const FeedSuggestionsCarousel = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [suggestions, setSuggestions] = useState<SuggestedLocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchSuggestions = async () => {
      try {
        // Get user's current city
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_city')
          .eq('id', user.id)
          .single();

        // Get popular locations in user's city that user hasn't saved
        const { data: userSaved } = await supabase
          .from('user_saved_locations')
          .select('location_id')
          .eq('user_id', user.id);

        const savedIds = new Set(userSaved?.map(s => s.location_id) || []);

        let query = supabase
          .from('locations')
          .select('id, name, category, city, image_url, latitude, longitude')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (profile?.current_city) {
          query = query.ilike('city', `%${profile.current_city}%`);
        }

        const { data: locations, error } = await query;

        if (error) throw error;

        // Filter out already saved and get save counts
        const unsaved = (locations || []).filter(loc => !savedIds.has(loc.id));

        // Get save counts for each location
        const withCounts = await Promise.all(
          unsaved.slice(0, 10).map(async (loc) => {
            const { count } = await supabase
              .from('user_saved_locations')
              .select('*', { count: 'exact', head: true })
              .eq('location_id', loc.id);

            // Get a few users who saved this
            const { data: savers } = await supabase
              .from('user_saved_locations')
              .select('user_id')
              .eq('location_id', loc.id)
              .limit(3);

            let savedBy: Array<{ avatar_url: string | null; username: string }> = [];
            if (savers && savers.length > 0) {
              const { data: profiles } = await supabase
                .from('profiles')
                .select('avatar_url, username')
                .in('id', savers.map(s => s.user_id));
              savedBy = profiles || [];
            }

            return {
              ...loc,
              save_count: count || 0,
              saved_by: savedBy
            };
          })
        );

        // Sort by save count
        withCounts.sort((a, b) => b.save_count - a.save_count);
        setSuggestions(withCounts);
      } catch (err) {
        console.error('Error fetching suggestions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [user?.id]);

  if (loading || suggestions.length === 0) return null;

  const handleLocationClick = (loc: SuggestedLocation) => {
    navigate('/', {
      state: {
        centerMap: {
          lat: loc.latitude,
          lng: loc.longitude,
          locationId: loc.id,
          shouldFocus: true
        },
        openPinDetail: {
          id: loc.id,
          name: loc.name,
          lat: loc.latitude,
          lng: loc.longitude,
          category: loc.category
        }
      }
    });
  };

  return (
    <div className="py-4">
      {/* Header */}
      <div className="flex items-center justify-between px-4 mb-3">
        <h3 className="font-bold text-foreground">{t('pickedForYou', { defaultValue: 'picked for you' })}</h3>
        <button 
          onClick={() => navigate('/explore')}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('viewTheList', { defaultValue: 'view the list' })}
        </button>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {suggestions.map((loc) => (
          <button
            key={loc.id}
            onClick={() => handleLocationClick(loc)}
            className="shrink-0 w-72 bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="flex gap-3 p-3">
              {/* Image */}
              <div className="relative w-28 h-28 rounded-lg overflow-hidden shrink-0">
                {loc.image_url ? (
                  <img 
                    src={loc.image_url} 
                    alt={loc.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-2xl">📍</span>
                  </div>
                )}
                {/* Distance badge - placeholder */}
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  nearby
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                <div>
                  <h4 className="font-bold text-foreground line-clamp-1">{loc.name}</h4>
                  <p className="text-xs text-muted-foreground">€€</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>🍜</span>
                    <span>{loc.category}</span>
                  </p>
                </div>

                {/* Saved by */}
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    {loc.saved_by.length > 0 && (
                      <div className="flex -space-x-1.5">
                        {loc.saved_by.slice(0, 3).map((saver, idx) => (
                          <Avatar key={idx} className="h-5 w-5 border border-background">
                            <AvatarImage src={saver.avatar_url || undefined} />
                            <AvatarFallback className="text-[8px] bg-primary/10">
                              {saver.username?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    )}
                    {loc.save_count > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {t('savedNTimes', { count: loc.save_count, defaultValue: `saved ${loc.save_count} times` })}
                      </span>
                    )}
                  </div>
                  <button className="p-1.5 rounded-full hover:bg-muted">
                    <Bookmark className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

FeedSuggestionsCarousel.displayName = 'FeedSuggestionsCarousel';

export default FeedSuggestionsCarousel;
