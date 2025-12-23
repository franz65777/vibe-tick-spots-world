import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import ColorfulGradientBackground from '@/components/common/ColorfulGradientBackground';
import listIcon from '@/assets/list-icon.png';

interface FolderItem {
  id: string;
  name: string;
  cover_image_url: string | null;
  color: string | null;
  is_private: boolean;
  location_count: number;
  visited_count: number;
  owner_username: string;
}

const FeedListsCarousel = memo(() => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { location: geoLocation } = useGeolocation();
  const [lists, setLists] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchLists = async () => {
      try {
        // Get user's current city from geolocation
        const userCity = geoLocation?.city;
        
        // Get public folders that have locations in user's proximity
        let query = supabase
          .from('saved_folders')
          .select(`
            id,
            name,
            cover_image_url,
            color,
            is_private,
            profiles!saved_folders_user_id_fkey (username)
          `)
          .eq('is_private', false)
          .order('created_at', { ascending: false })
          .limit(20);

        const { data: folders, error } = await query;

        if (error) throw error;

        // Filter folders that have locations near user's city
        const foldersWithProximity = await Promise.all(
          (folders || []).map(async (folder: any) => {
            // Get locations in this folder
            const { data: folderLocations } = await supabase
              .from('folder_locations')
              .select('location_id')
              .eq('folder_id', folder.id);

            if (!folderLocations || folderLocations.length === 0) {
              return null;
            }

            const locationIds = folderLocations.map(fl => fl.location_id);

            // Check if any location is in user's city or nearby
            let hasNearbyLocation = false;
            
            if (userCity && geoLocation?.latitude && geoLocation?.longitude) {
              const { data: nearbyLocations } = await supabase
                .from('locations')
                .select('id, city, latitude, longitude')
                .in('id', locationIds);

              if (nearbyLocations) {
                hasNearbyLocation = nearbyLocations.some(loc => {
                  // Check if same city
                  if (loc.city?.toLowerCase() === userCity.toLowerCase()) {
                    return true;
                  }
                  // Check if within ~50km radius
                  if (loc.latitude && loc.longitude && geoLocation.latitude && geoLocation.longitude) {
                    const distance = Math.sqrt(
                      Math.pow(loc.latitude - geoLocation.latitude, 2) +
                      Math.pow(loc.longitude - geoLocation.longitude, 2)
                    );
                    return distance < 0.5; // Approximately 50km
                  }
                  return false;
                });
              }
            }

            // If no geolocation, show all public folders
            if (!userCity || hasNearbyLocation) {
              return {
                id: folder.id,
                name: folder.name,
                cover_image_url: folder.cover_image_url,
                color: folder.color,
                is_private: folder.is_private,
                location_count: locationIds.length,
                visited_count: 0,
                owner_username: folder.profiles?.username || 'user'
              };
            }

            return null;
          })
        );

        // Filter out null entries and limit to 10
        const validFolders = foldersWithProximity.filter(f => f !== null).slice(0, 10);
        setLists(validFolders);
      } catch (err) {
        console.error('Error fetching lists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [user?.id, geoLocation?.city, geoLocation?.latitude, geoLocation?.longitude]);

  if (loading || lists.length === 0) return null;

  return (
    <div className="py-4">
      {/* Header */}
      <div className="px-4 mb-3 flex items-center gap-2">
        <img src={listIcon} alt="" className="w-5 h-5 object-contain" />
        <h3 className="font-bold text-foreground">{t('listsForYou', { defaultValue: 'lists for you' })}</h3>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => {
              // Dispatch event to open folder modal directly in FeedPage
              // This keeps the feed mounted and preserves scroll position
              window.dispatchEvent(new CustomEvent('feed:open-folder', { 
                detail: { folderId: list.id } 
              }));
            }}
            className="shrink-0 w-40 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
          >
            {/* Cover image or gradient */}
            <div className="relative aspect-[4/5] w-full">
              {list.cover_image_url ? (
                <img 
                  src={list.cover_image_url} 
                  alt={list.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <ColorfulGradientBackground seed={list.id} />
              )}
              
              {/* Gradient overlay at bottom */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              
              {/* Text content - aligned left */}
              <div className="absolute bottom-0 left-0 right-0 p-3 text-left">
                <h4 className="font-bold text-white text-sm line-clamp-2">{list.name}</h4>
                <p className="text-white/70 text-xs mt-0.5">
                  {t('by', { defaultValue: 'by' })} @{list.owner_username}
                </p>
                <p className="text-white/70 text-xs">
                  {t('visited', { defaultValue: 'visited' })} 0/{list.location_count}
                </p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});

FeedListsCarousel.displayName = 'FeedListsCarousel';

export default FeedListsCarousel;
