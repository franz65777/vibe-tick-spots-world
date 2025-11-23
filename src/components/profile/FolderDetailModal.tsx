import { X, MapPin, Eye, Bookmark, Share2, MoreVertical, Users, Folder, BookmarkCheck, Star, Utensils } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { useAuth } from '@/contexts/AuthContext';
import StoriesViewer from '@/components/StoriesViewer';
import PinDetailCard from '@/components/explore/PinDetailCard';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import FolderSavedByModal from './FolderSavedByModal';
import { LocationShareModal } from '@/components/explore/LocationShareModal';
import { cn } from '@/lib/utils';
import { useLocationStats } from '@/hooks/useLocationStats';
import { useLocationSavers } from '@/hooks/useLocationSavers';

interface FolderDetailModalProps {
  folderId: string;
  isOpen: boolean;
  onClose: () => void;
}

const LocationCardWithStats = ({ location, onClick }: { location: any; onClick: () => void }) => {
  const { stats } = useLocationStats(location.id, location.google_place_id);
  const { savers } = useLocationSavers(location.id, 3);

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
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
      <div className="flex-1 min-w-0 text-left space-y-1">
        <h4 className="font-medium truncate">{location.name}</h4>
        <p className="text-sm text-muted-foreground truncate">
          {location.category} • {location.city}
        </p>
        <div className="flex items-center gap-3 text-xs">
          {stats.averageRating && stats.averageRating > 0 && (
            <div className="flex items-center gap-1">
              {location.category === 'restaurant' || location.category === 'cafe' || location.category === 'bakery' ? (
                <Utensils className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              )}
               <span 
                 className="font-bold" 
                 style={{
                   background: 'linear-gradient(to right, #f59e0b, #d97706)',
                   WebkitBackgroundClip: 'text',
                   WebkitTextFillColor: 'transparent',
                   backgroundClip: 'text'
                 }}
               >
                 {stats.averageRating.toFixed(1)}
               </span>
            </div>
          )}
          {stats.totalSaves > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Bookmark className="w-3.5 h-3.5" />
              <span>{stats.totalSaves}</span>
            </div>
          )}
          {savers.length > 0 && (
            <div className="flex items-center -space-x-2">
              {savers.map((saver) => (
                <Avatar key={saver.id} className="w-5 h-5 ring-2 ring-background">
                  <AvatarImage src={saver.avatar_url} />
                  <AvatarFallback className="text-[8px]">{saver.username?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

const FolderDetailModal = ({ folderId, isOpen, onClose }: FolderDetailModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [folder, setFolder] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showStories, setShowStories] = useState(false);
  const [creatorStories, setCreatorStories] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showSavedBy, setShowSavedBy] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.setAttribute('data-folder-modal-open', 'true');
    } else {
      document.body.removeAttribute('data-folder-modal-open');
    }
    return () => {
      document.body.removeAttribute('data-folder-modal-open');
    };
  }, [isOpen]);

  const handleScroll = (e: any) => {
    const scrollTop = e.target.scrollTop;
    setScrolled(scrollTop > 50);
  };

  useEffect(() => {
    const fetchFolder = async () => {
      if (!folderId || !isOpen) return;
      
      setLoading(true);
      try {
        // Fetch all data in parallel for better performance
        const [folderResult, folderLocsResult] = await Promise.all([
          supabase
            .from('saved_folders')
            .select(`
              *,
              profiles!saved_folders_user_id_fkey (
                id,
                username,
                avatar_url
              )
            `)
            .eq('id', folderId)
            .single(),
          supabase
            .from('folder_locations')
            .select('location_id')
            .eq('folder_id', folderId)
        ]);

        if (folderResult.error) throw folderResult.error;
        if (folderLocsResult.error) throw folderLocsResult.error;

        const folderData = folderResult.data;
        const folderLocs = folderLocsResult.data;

        let locationsData: any[] = [];

        if (folderLocs && folderLocs.length > 0) {
          const locationIds = folderLocs.map((fl: any) => fl.location_id);
          const { data: locs, error: locationsError } = await supabase
            .from('locations')
            .select('id, name, category, city, image_url, latitude, longitude, address, google_place_id')
            .in('id', locationIds);

          if (locationsError) throw locationsError;
          locationsData = locs || [];
        }

        setFolder(folderData);
        setLocations(locationsData);

        // Check folder save status
        if (user && folderData.user_id !== user.id) {
          const { data: savedData } = await supabase
            .from('folder_saves')
            .select('id')
            .eq('folder_id', folderId)
            .eq('user_id', user.id)
            .maybeSingle();
          setIsSaved(!!savedData);
        }

        // Fetch creator's active stories
        const { data: storiesData } = await supabase
          .from('stories')
          .select(`
            id,
            user_id,
            media_url,
            media_type,
            location_id,
            created_at,
            expires_at,
            locations (
              name,
              address,
              category
            )
          `)
          .eq('user_id', folderData.user_id)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false });

        const formattedStories = (storiesData || []).map((story: any) => ({
          id: story.id,
          userId: story.user_id,
          userName: folderData.profiles?.username || '',
          userAvatar: folderData.profiles?.avatar_url || '',
          mediaUrl: story.media_url,
          mediaType: story.media_type,
          locationId: story.location_id,
          locationName: story.locations?.name || '',
          locationAddress: story.locations?.address || '',
          locationCategory: story.locations?.category,
          timestamp: story.created_at,
          isViewed: false
        }));
        setCreatorStories(formattedStories);

        // Track folder view (non-blocking)
        if (user) {
          supabase.from('folder_views').insert({
            folder_id: folderId,
            user_id: user.id
          });
        }
      } catch (error) {
        console.error('Error fetching folder:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFolder();
  }, [folderId, isOpen, user]);

  const handleSaveFolder = async () => {
    if (!user || !folderId) return;

    try {
      if (isSaved) {
        await supabase
          .from('folder_saves')
          .delete()
          .eq('folder_id', folderId)
          .eq('user_id', user.id);
        
        setIsSaved(false);
        toast.success(t('profile:folderUnsaved', { defaultValue: 'Lista rimossa dai salvati' }));
      } else {
        await supabase
          .from('folder_saves')
          .insert({
            folder_id: folderId,
            user_id: user.id
          });
        
        setIsSaved(true);
        toast.success(t('profile:folderSaved', { defaultValue: 'Lista salvata' }));
      }
    } catch (error) {
      console.error('Error toggling folder save:', error);
      toast.error(t('common:error', { defaultValue: 'Errore' }));
    }
  };

  const handleAvatarClick = () => {
    if (folder?.profiles?.id && folder.profiles.id !== user?.id) {
      navigate(`/profile/${folder.profiles.id}`);
      onClose();
    }
  };

  const handleLocationClick = async (location: any) => {
    // Pre-fetch location data for faster loading
    const fetchPromises = [];
    
    if (location.id) {
      fetchPromises.push(
        supabase
          .from('posts')
          .select('id, media_urls, caption, rating, user_id, created_at')
          .eq('location_id', location.id)
          .order('created_at', { ascending: false })
          .limit(20)
      );
    }

    // Execute pre-fetch in background
    Promise.all(fetchPromises).catch(console.error);

    // Format location data for PinDetailCard
    setSelectedLocation({
      ...location,
      coordinates: {
        lat: location.latitude,
        lng: location.longitude
      }
    });
  };

  const handleClose = () => {
    setSelectedLocation(null);
    onClose();
  };

  if (!isOpen) return null;
  if (loading) {
    return (
      <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }
  if (!folder) return null;

  const isOwnFolder = folder.user_id === user?.id;

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-[10000] flex items-end justify-center bg-black/60 animate-in fade-in duration-200",
          selectedLocation && "hidden"
        )}
        onClick={handleClose}
      >
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
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-300px)]" onScroll={handleScroll}>
            <div className="p-6 space-y-6">
              {/* Title */}
              <h2 className="text-2xl font-bold">{folder.name}</h2>

              {/* Stats Row with Action Buttons - Fade on scroll */}
              <div className={cn(
                "flex items-center justify-between transition-opacity duration-300",
                scrolled && "opacity-0 pointer-events-none"
              )}>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{locations.length}</span>
                  </div>
                  <button
                    onClick={() => setShowSavedBy(true)}
                    className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                  >
                    <Bookmark className="h-4 w-4" />
                    <span className="font-medium">{folder.save_count || 0}</span>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <Eye className="h-4 w-4" />
                    <span className="font-medium">{folder.view_count || 0}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  {!isOwnFolder && (
                    <Button
                      size="sm"
                      variant={isSaved ? "default" : "outline"}
                      onClick={handleSaveFolder}
                      className="rounded-full"
                    >
                      {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowShareModal(true)}
                    className="rounded-full"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* User Info with Stories - Fade on scroll */}
              {folder.profiles && (
                <div className={cn(
                  "flex items-center gap-3 transition-opacity duration-300",
                  scrolled && "opacity-0 pointer-events-none"
                )}>
                  <button
                    onClick={handleAvatarClick}
                    disabled={isOwnFolder}
                    className="relative"
                  >
                    <Avatar className={cn(
                      "h-12 w-12",
                      creatorStories.length > 0 && "ring-2 ring-primary ring-offset-2",
                      !isOwnFolder && "cursor-pointer hover:opacity-80 transition-opacity"
                    )}>
                      <AvatarImage src={folder.profiles.avatar_url} />
                      <AvatarFallback>{folder.profiles.username?.[0]?.toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </button>
                  <div className="flex-1">
                    <button
                      onClick={handleAvatarClick}
                      disabled={isOwnFolder}
                      className={cn(
                        "text-sm font-medium",
                        !isOwnFolder && "hover:underline cursor-pointer"
                      )}
                    >
                      @{folder.profiles.username}
                    </button>
                    {creatorStories.length > 0 && (
                      <button
                        onClick={() => setShowStories(true)}
                        className="block text-xs text-primary hover:underline"
                      >
                        {t('common:viewStory', { defaultValue: 'Visualizza storia' })}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {folder.description && (
                <p className="text-foreground leading-relaxed">{folder.description}</p>
              )}

              {/* Locations */}
              {locations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">{t('common:vibes', { defaultValue: 'Vibes' })}</h3>
                  <div className="space-y-2">
                    {locations.map((location: any) => (
                      <LocationCardWithStats 
                        key={location.id}
                        location={location}
                        onClick={() => handleLocationClick(location)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stories Viewer */}
      {showStories && creatorStories.length > 0 && (
        <StoriesViewer
          stories={creatorStories}
          initialStoryIndex={0}
          onClose={() => setShowStories(false)}
          onStoryViewed={() => {}}
        />
      )}

      {/* Location Detail */}
      {selectedLocation && (
        <div className="fixed inset-0 z-[10010]">
          <PinDetailCard 
            place={selectedLocation}
            onClose={() => setSelectedLocation(null)}
            onBack={() => setSelectedLocation(null)}
          />
        </div>
      )}

      {/* Saved By Modal */}
      {showSavedBy && (
        <FolderSavedByModal
          isOpen={showSavedBy}
          onClose={() => setShowSavedBy(false)}
          folderId={folderId}
        />
      )}

      {/* Share Modal - Higher z-index than folder modal */}
      {showShareModal && folder && (
        <LocationShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          place={{
            id: folderId,
            name: folder.name,
            type: 'folder'
          }}
          zIndex={10010}
        />
      )}
    </>
  );
};

export default FolderDetailModal;
