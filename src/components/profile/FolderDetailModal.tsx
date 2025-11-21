import { X, MapPin, Eye, Bookmark, Folder } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface FolderDetailModalProps {
  folderId: string;
  isOpen: boolean;
  onClose: () => void;
}

const FolderDetailModal = ({ folderId, isOpen, onClose }: FolderDetailModalProps) => {
  const [folder, setFolder] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFolder = async () => {
      if (!folderId || !isOpen) return;
      
      setLoading(true);
      try {
        // Fetch folder details
        const { data: folderData, error: folderError } = await supabase
          .from('saved_folders')
          .select('*')
          .eq('id', folderId)
          .single();

        if (folderError) throw folderError;

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', folderData.user_id)
          .single();

        // Fetch folder locations and then load their details
        const { data: folderLocs, error: locsError } = await supabase
          .from('folder_locations')
          .select('location_id')
          .eq('folder_id', folderId);

        if (locsError) throw locsError;

        let locationsData: any[] = [];

        if (folderLocs && folderLocs.length > 0) {
          const locationIds = folderLocs.map((fl: any) => fl.location_id);
          const { data: locs, error: locationsError } = await supabase
            .from('locations')
            .select('id, name, category, city, image_url')
            .in('id', locationIds);

          if (locationsError) throw locationsError;
          locationsData = locs || [];
        }

        setFolder({ ...folderData, profiles: profile });
        setLocations(locationsData);
      } catch (error) {
        console.error('Error fetching folder:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFolder();
  }, [folderId, isOpen]);

  if (!isOpen) return null;
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }
  if (!folder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 animate-in fade-in duration-200" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-background rounded-t-3xl max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cover Image */}
        <div className="relative aspect-[4/3] bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center overflow-hidden">
          {folder.cover_image_url ? (
            <img
              src={folder.cover_image_url}
              alt={folder.name}
              className="w-full h-full object-cover"
            />
          ) : locations[0]?.image_url ? (
            <img
              src={locations[0].image_url}
              alt={folder.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <Folder className="w-16 h-16 text-primary/40" />
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors shadow-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-300px)]">
          {/* Title */}
          <h2 className="text-2xl font-bold">{folder.name}</h2>

          {/* Stats Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{locations.length}</span>
              <span>places</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Bookmark className="h-4 w-4" />
              <span className="font-medium">{folder.save_count || 0}</span>
              <span>saves</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{folder.view_count || 0}</span>
              <span>views</span>
            </div>
          </div>

          {/* User Info */}
          {folder.profiles && (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={folder.profiles.avatar_url} />
                <AvatarFallback>{folder.profiles.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">@{folder.profiles.username}</span>
            </div>
          )}

          {/* Description */}
          {folder.description && (
            <p className="text-foreground leading-relaxed">{folder.description}</p>
          )}

          {/* Locations */}
          {locations.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Locations</h3>
              <div className="space-y-2">
                {locations.map((location: any) => (
                  <div
                    key={location.id}
                    className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                  >
                    {location.image_url ? (
                      <img 
                        src={location.image_url} 
                        alt={location.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <CategoryIcon category={location.category} className="w-8 h-8" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium truncate">{location.name}</h4>
                      <p className="text-sm text-muted-foreground truncate">
                        {location.category} • {location.city}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FolderDetailModal;
