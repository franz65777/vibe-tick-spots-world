import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface FolderWithDetails {
  id: string;
  name: string;
  user_id: string;
  is_private: boolean;
  cover_image_url: string | null;
  created_at: string;
  locations_count: number;
  location_categories?: string[];
  cover_image?: string | null;
  creator?: {
    username: string | null;
    avatar_url: string | null;
  };
}

interface OptimizedFoldersResult {
  folders: FolderWithDetails[];
  savedFolders: FolderWithDetails[];
}

// Helper to extract first photo URL from locations.photos (can be array of strings or objects)
const extractFirstPhotoUrl = (photos: unknown): string | null => {
  if (!photos) return null;
  if (!Array.isArray(photos)) return null;
  if (photos.length === 0) return null;
  
  const first = photos[0];
  if (typeof first === 'string') return first;
  if (typeof first === 'object' && first !== null) {
    // Handle {url: string} or {photo_reference: string} patterns
    return (first as any).url || (first as any).photo_reference || null;
  }
  return null;
};

export const useOptimizedFolders = (userId?: string, currentUserId?: string) => {
  const isOwnProfile = !userId || userId === currentUserId;

  return useQuery({
    queryKey: ['optimized-folders', userId, isOwnProfile],
    queryFn: async (): Promise<OptimizedFoldersResult> => {
      if (!userId) return { folders: [], savedFolders: [] };

      // 1) Fetch all user's folders in one query
      let query = supabase.from('saved_folders').select('*').eq('user_id', userId);
      if (!isOwnProfile) {
        query = query.eq('is_private', false);
      }
      
      const { data: folders, error: foldersError } = await query.order('created_at', { ascending: false });
      if (foldersError) throw foldersError;
      if (!folders?.length && !isOwnProfile) return { folders: [], savedFolders: [] };

      const folderIds = (folders || []).map(f => f.id);
      
      // 2) Batch queries for folder locations (counts + preview data)
      const [countsRes, previewLocsRes] = await Promise.all([
        folderIds.length 
          ? supabase.from('folder_locations').select('folder_id').in('folder_id', folderIds)
          : Promise.resolve({ data: [] }),
        folderIds.length
          ? supabase.from('folder_locations').select('folder_id, location_id').in('folder_id', folderIds).limit(100)
          : Promise.resolve({ data: [] })
      ]);

      // Count locations per folder
      const countMap = new Map<string, number>();
      ((countsRes.data as any[]) || []).forEach((fl: any) => {
        countMap.set(fl.folder_id, (countMap.get(fl.folder_id) || 0) + 1);
      });

      // 3) Batch query for location images - NOW INCLUDING photos field
      const locationIds = [...new Set(((previewLocsRes.data as any[]) || []).map((fl: any) => fl.location_id))];
      const { data: locations } = locationIds.length 
        ? await supabase.from('locations')
            .select('id, category, image_url, photos')
            .in('id', locationIds)
        : { data: [] };
      
      const locationMap = new Map((locations || []).map(l => [l.id, l]));

      // 4) Enrich folders with counts and images (with photos fallback)
      const enrichedFolders: FolderWithDetails[] = (folders || []).map(folder => {
        const folderLocs = ((previewLocsRes.data as any[]) || [])
          .filter((fl: any) => fl.folder_id === folder.id);
        const firstLoc = folderLocs[0] ? locationMap.get(folderLocs[0].location_id) : null;
        const categories = folderLocs
          .map((fl: any) => locationMap.get(fl.location_id)?.category)
          .filter(Boolean) as string[];
        
        // Cover fallback: folder.cover_image_url -> firstLoc.image_url -> firstLoc.photos[0]
        const coverUrl = folder.cover_image_url 
          || firstLoc?.image_url 
          || extractFirstPhotoUrl(firstLoc?.photos) 
          || null;
        
        return {
          ...folder,
          locations_count: countMap.get(folder.id) || 0,
          location_categories: categories,
          cover_image_url: coverUrl,
          cover_image: coverUrl,
        };
      });

      // 5) For own profile, fetch saved folders from other users
      let savedFolders: FolderWithDetails[] = [];
      
      if (isOwnProfile && currentUserId) {
        const { data: savedFolderIds } = await supabase
          .from('folder_saves')
          .select('folder_id')
          .eq('user_id', currentUserId);

        if (savedFolderIds && savedFolderIds.length > 0) {
          const savedIds = savedFolderIds.map(sf => sf.folder_id);
          
          // Filter out folders I own
          const { data: otherFolders } = await supabase
            .from('saved_folders')
            .select('*')
            .in('id', savedIds)
            .neq('user_id', currentUserId);

          if (otherFolders && otherFolders.length > 0) {
            const otherFolderIds = otherFolders.map(f => f.id);
            const otherUserIds = [...new Set(otherFolders.map(f => f.user_id))];

            // Batch fetch counts, locations, and creator profiles
            const [otherCountsRes, otherPreviewRes, creatorsRes] = await Promise.all([
              supabase.from('folder_locations').select('folder_id').in('folder_id', otherFolderIds),
              supabase.from('folder_locations').select('folder_id, location_id').in('folder_id', otherFolderIds).limit(50),
              supabase.from('profiles').select('id, username, avatar_url').in('id', otherUserIds)
            ]);

            const otherCountMap = new Map<string, number>();
            ((otherCountsRes.data as any[]) || []).forEach((fl: any) => {
              otherCountMap.set(fl.folder_id, (otherCountMap.get(fl.folder_id) || 0) + 1);
            });

            // Get location details with photos
            const otherLocationIds = [...new Set(((otherPreviewRes.data as any[]) || []).map((fl: any) => fl.location_id))];
            const { data: otherLocations } = otherLocationIds.length
              ? await supabase.from('locations').select('id, image_url, photos').in('id', otherLocationIds)
              : { data: [] };
            
            const otherLocationMap = new Map((otherLocations || []).map(l => [l.id, l]));
            const creatorMap = new Map((creatorsRes.data || []).map(p => [p.id, p]));

            savedFolders = otherFolders.map(folder => {
              const folderLocs = ((otherPreviewRes.data as any[]) || [])
                .filter((fl: any) => fl.folder_id === folder.id);
              const firstLoc = folderLocs[0] ? otherLocationMap.get(folderLocs[0].location_id) : null;
              const creator = creatorMap.get(folder.user_id);

              // Cover fallback for saved folders too
              const coverUrl = folder.cover_image_url 
                || firstLoc?.image_url 
                || extractFirstPhotoUrl(firstLoc?.photos) 
                || null;

              return {
                ...folder,
                locations_count: otherCountMap.get(folder.id) || 0,
                cover_image_url: coverUrl,
                creator: creator ? { username: creator.username, avatar_url: creator.avatar_url } : undefined,
              };
            });
          }
        }
      }

      return { folders: enrichedFolders, savedFolders };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes - shows cached data instantly
    gcTime: 10 * 60 * 1000,   // 10 minutes in memory
    enabled: !!userId,
  });
};
