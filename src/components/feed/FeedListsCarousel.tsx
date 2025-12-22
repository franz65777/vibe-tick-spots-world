import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ColorfulGradientBackground from '@/components/common/ColorfulGradientBackground';

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
  const [lists, setLists] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchLists = async () => {
      try {
        // Get user's folders
        const { data: folders, error } = await supabase
          .from('saved_folders')
          .select(`
            id,
            name,
            cover_image_url,
            color,
            is_private,
            profiles!saved_folders_user_id_fkey (username)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        // Get location counts for each folder
        const foldersWithCounts = await Promise.all(
          (folders || []).map(async (folder: any) => {
            const { count } = await supabase
              .from('folder_locations')
              .select('*', { count: 'exact', head: true })
              .eq('folder_id', folder.id);

            return {
              id: folder.id,
              name: folder.name,
              cover_image_url: folder.cover_image_url,
              color: folder.color,
              is_private: folder.is_private,
              location_count: count || 0,
              visited_count: 0, // Could calculate this from user interactions
              owner_username: folder.profiles?.username || 'you'
            };
          })
        );

        setLists(foldersWithCounts);
      } catch (err) {
        console.error('Error fetching lists:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLists();
  }, [user?.id]);

  if (loading || lists.length === 0) return null;

  return (
    <div className="py-4">
      {/* Header */}
      <div className="px-4 mb-3">
        <h3 className="font-bold text-foreground">{t('listsForYou', { defaultValue: 'lists for you' })}</h3>
      </div>

      {/* Horizontal scroll */}
      <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {lists.map((list) => (
          <button
            key={list.id}
            onClick={() => navigate(`/folder/${list.id}`)}
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
              
              {/* Overlay with text */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h4 className="font-bold text-white text-sm line-clamp-2">{list.name}</h4>
                <p className="text-white/70 text-xs mt-0.5">by @{list.owner_username}</p>
                <p className="text-white/70 text-xs">visited 0/{list.location_count}</p>
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
