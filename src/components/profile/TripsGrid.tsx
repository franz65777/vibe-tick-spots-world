import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react';
import CreateTripModal from './CreateTripModal';
import { useTranslation } from 'react-i18next';
import tripsEmptyImage from '@/assets/trips-empty-state.png';
import { useTrips } from '@/hooks/useTrips';
import TripDetailModal from './TripDetailModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SavedFoldersDrawer from './SavedFoldersDrawer';
import FolderEditorPage from './FolderEditorPage';
import FolderDetailModal from './FolderDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import ColorfulGradientBackground from '@/components/common/ColorfulGradientBackground';
interface TripsGridProps {
  userId?: string; // Optional userId prop to view another user's lists
}
const TripsGrid: React.FC<TripsGridProps> = ({
  userId: propUserId
}) => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [editingTrip, setEditingTrip] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showFolderEditor, setShowFolderEditor] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [viewingFolderId, setViewingFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const {
    t
  } = useTranslation('trips');
  const {
    user
  } = useAuth();
  const {
    trips,
    isLoading,
    createTrip,
    updateTrip,
    deleteTrip
  } = useTrips(propUserId || user?.id);

  // Use propUserId if provided, otherwise use authenticated user's id
  const targetUserId = propUserId || user?.id;
  const isOwnProfile = !propUserId || propUserId === user?.id;
  useEffect(() => {
    loadFolders();
  }, [targetUserId]);
  const loadFolders = async () => {
    if (!targetUserId) return;
    setFoldersLoading(true);
    try {
      // For viewing other users, only load their public folders
      // For own profile, load all folders
      let query = supabase.from('saved_folders').select('*').eq('user_id', targetUserId);
      
      // If viewing another user's profile, filter to only public folders
      if (!isOwnProfile) {
        query = query.eq('is_private', false);
      }
      
      const {
        data,
        error
      } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get location counts for each folder
      const foldersWithCounts = await Promise.all((data || []).map(async (folder: any) => {
        const {
          count
        } = await supabase.from('folder_locations').select('*', {
          count: 'exact',
          head: true
        }).eq('folder_id', folder.id);

        // Get first few locations for preview
        const {
          data: folderLocs
        } = await supabase.from('folder_locations').select('location_id').eq('folder_id', folder.id).limit(4);
        let categories: string[] = [];
        let coverImage: string | null = null;
        if (folderLocs && folderLocs.length > 0) {
          const locationIds = folderLocs.map((fl: any) => fl.location_id);
          const {
            data: locs
          } = await supabase.from('locations').select('category, image_url').in('id', locationIds);
          if (locs) {
            categories = locs.map((l: any) => l.category).filter(Boolean);
            coverImage = locs[0]?.image_url || null;
          }
        }
        return {
          ...folder,
          locations_count: count || 0,
          location_categories: categories,
          // Keep both cover_image and cover_image_url for compatibility
          cover_image_url: folder.cover_image_url || coverImage,
          cover_image: folder.cover_image_url || coverImage
        };
      }));
      setFolders(foldersWithCounts);
    } catch (error) {
      console.error('Error loading folders:', error);
    } finally {
      setFoldersLoading(false);
    }
  };
  const handleCreateTrip = async (tripData: any) => {
    await createTrip(tripData);
    setShowCreateModal(false);
  };
  const handleEditTrip = (trip: any) => {
    setEditingTrip(trip);
    setEditName(trip.name);
    setEditDescription(trip.description || '');
  };
  const handleSaveEdit = async () => {
    if (editingTrip) {
      await updateTrip(editingTrip.id, {
        name: editName,
        description: editDescription
      });
      setEditingTrip(null);
    }
  };
  const handleDeleteTrip = async (tripId: string) => {
    if (confirm(t('confirmDelete', 'Are you sure you want to delete this list?'))) {
      await deleteTrip(tripId);
    }
  };
  if (isLoading || foldersLoading) {
    return <div className="px-4 pt-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>;
  }
  const allLists = [...folders, ...trips];
  return <div className="px-4 pt-4">
      {allLists.length === 0 ? <div className="flex flex-col items-center justify-center py-4 text-center">
          {isOwnProfile && <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
              <button onClick={() => setShowCreateModal(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105">
                <Plus className="w-5 h-5" />
                {t('createButton')}
              </button>
            </div>}
          
          <div className="mb-6 relative w-full max-w-xs aspect-[4/3]">
            <img src={tripsEmptyImage} alt="Travel group" className="w-full h-full object-contain" />
          </div>
          
          <p className="text-foreground text-base font-medium max-w-xs">
            {t('planWithFriends')}
          </p>
        </div> : <>
          {isOwnProfile}
          
          <div className="grid grid-cols-2 gap-3 pb-4">
            {/* Folders (main lists) */}
            {folders.map((folder, index) => (
              <div 
                key={`folder-${folder.id}`} 
                className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer aspect-[4/5]"
                onClick={() => setViewingFolderId(folder.id)}
              >
                {/* Background Image or Colorful Gradient Fallback */}
                {folder.cover_image_url ? (
                  <img 
                    src={folder.cover_image_url} 
                    alt={folder.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ColorfulGradientBackground seed={folder.id || index} />
                )}
                
                {/* Title overlay at bottom with gradient fade */}
                <div 
                  className="absolute bottom-0 left-0 right-0 p-3 pt-16"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.1) 75%, transparent 100%)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)'
                  }}
                >
                  <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight drop-shadow-sm">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-white/80 mt-1 drop-shadow-sm">
                    {folder.locations_count || 0} {folder.locations_count === 1 ? t('place') : t('places')}
                  </p>
                </div>
                
                {/* Edit button - only show on own profile */}
                {isOwnProfile && (
                  <button 
                    onClick={e => {
                      e.stopPropagation();
                      navigate(`/create-list?folderId=${folder.id}`);
                    }} 
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            ))}

            {/* Trips */}
            {trips.map((trip, index) => (
              <div 
                key={trip.id} 
                className="relative rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer aspect-[4/5]"
                onClick={() => setSelectedTrip(trip)}
              >
                {/* Background Image or Colorful Gradient Fallback */}
                {trip.cover_image_url ? (
                  <img 
                    src={trip.cover_image_url} 
                    alt={trip.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ColorfulGradientBackground seed={trip.id || `trip-${index}`} />
                )}
                
                {/* Title overlay at bottom with gradient fade */}
                <div 
                  className="absolute bottom-0 left-0 right-0 p-3 pt-16"
                  style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.4) 30%, rgba(0,0,0,0.25) 50%, rgba(0,0,0,0.1) 75%, transparent 100%)',
                    backdropFilter: 'blur(4px)',
                    WebkitBackdropFilter: 'blur(4px)',
                    maskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)',
                    WebkitMaskImage: 'linear-gradient(to top, black 0%, black 40%, transparent 100%)'
                  }}
                >
                  <h3 className="font-bold text-sm text-white line-clamp-2 leading-tight drop-shadow-sm">
                    {trip.name}
                  </h3>
                  <p className="text-xs text-white/80 mt-1 drop-shadow-sm">
                    {trip.trip_locations?.length || 0} {(trip.trip_locations?.length || 0) === 1 ? t('place') : t('places')}
                  </p>
                </div>
                
                {/* More options dropdown */}
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 bg-black/30 backdrop-blur-sm hover:bg-black/50">
                        <MoreVertical className="h-4 w-4 text-white" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        handleEditTrip(trip);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('edit', 'Edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={e => {
                        e.stopPropagation();
                        handleDeleteTrip(trip.id);
                      }} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('delete', 'Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </>}

      <CreateTripModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreateTrip={handleCreateTrip} />

      {selectedTrip && <TripDetailModal trip={selectedTrip} isOpen={!!selectedTrip} onClose={() => setSelectedTrip(null)} />}

      {viewingFolderId && <FolderDetailModal folderId={viewingFolderId} isOpen={!!viewingFolderId} onClose={() => setViewingFolderId(null)} />}

      {editingFolderId && <FolderEditorPage isOpen={!!editingFolderId} onClose={() => setEditingFolderId(null)} folderId={editingFolderId} onFolderSaved={() => {
      loadFolders();
      setEditingFolderId(null);
    }} />}

      {showFolderEditor && <FolderEditorPage isOpen={showFolderEditor} onClose={() => setShowFolderEditor(false)} onFolderSaved={() => {
      loadFolders();
      setShowFolderEditor(false);
    }} />}

      <Dialog open={!!editingTrip} onOpenChange={open => !open && setEditingTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="Trip name" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="Optional description" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTrip(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>;
};
export default TripsGrid;