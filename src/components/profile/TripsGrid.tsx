import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, MoreVertical, Edit, Trash2, Folder } from 'lucide-react';
import CreateTripModal from './CreateTripModal';
import { useTranslation } from 'react-i18next';
import tripsEmptyImage from '@/assets/trips-empty-state.png';
import { useTrips } from '@/hooks/useTrips';
import TripDetailModal from './TripDetailModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import SavedFoldersDrawer from './SavedFoldersDrawer';
import FolderEditorPage from './FolderEditorPage';
import FolderDetailModal from './FolderDetailModal';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CategoryIcon } from '@/components/common/CategoryIcon';

const TripsGrid = () => {
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
  const { t } = useTranslation('trips');
  const { trips, isLoading, createTrip, updateTrip, deleteTrip } = useTrips();
  const { user } = useAuth();

  useEffect(() => {
    loadFolders();
  }, [user]);

  const loadFolders = async () => {
    if (!user) return;

    setFoldersLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get location counts for each folder
      const foldersWithCounts = await Promise.all(
        (data || []).map(async (folder: any) => {
          const { count } = await supabase
            .from('folder_locations')
            .select('*', { count: 'exact', head: true })
            .eq('folder_id', folder.id);

          // Get first few locations for preview
          const { data: folderLocs } = await supabase
            .from('folder_locations')
            .select('location_id')
            .eq('folder_id', folder.id)
            .limit(4);

          let categories: string[] = [];
          let coverImage: string | null = null;

          if (folderLocs && folderLocs.length > 0) {
            const locationIds = folderLocs.map((fl: any) => fl.location_id);
            const { data: locs } = await supabase
              .from('locations')
              .select('category, image_url')
              .in('id', locationIds);

            if (locs) {
              categories = locs.map((l: any) => l.category).filter(Boolean);
              coverImage = locs[0]?.image_url || null;
            }
          }

          return {
            ...folder,
            locations_count: count || 0,
            location_categories: categories,
            // Use folder's cover_image_url if set, otherwise fallback to first location's image
            cover_image: folder.cover_image_url || coverImage
          };
        })
      );

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
    return (
      <div className="px-4 pt-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const allLists = [...folders, ...trips];

  return (
    <div className="px-4 pt-[25px]">
      {allLists.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-4 text-center">
          <div className="flex flex-col gap-3 w-full max-w-xs mb-8">
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              {t('createButton')}
            </button>
          </div>
          
          <div className="mb-6 relative w-full max-w-xs aspect-[4/3]">
            <img 
              src={tripsEmptyImage} 
              alt="Travel group"
              className="w-full h-full object-contain"
            />
          </div>
          
          <p className="text-foreground text-base font-medium max-w-xs">
            {t('planWithFriends')}
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <Button
              onClick={() => navigate('/create-list')}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl"
            >
              <Folder className="w-4 h-4 mr-2" />
              {t('newList')}
            </Button>
            <Button
              onClick={() => navigate('/create-trip')}
              variant="outline"
              className="flex-1 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('newTrip')}
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pb-4">
            {/* Folders (main lists) */}
            {folders.map((folder) => (
              <div
                key={`folder-${folder.id}`}
                className="relative bg-card rounded-xl overflow-hidden shadow-sm border border-border hover:shadow-md transition-shadow group cursor-pointer"
                onClick={() => setViewingFolderId(folder.id)}
              >
                <div className="aspect-square bg-muted">
                  {folder.cover_image_url ? (
                    <img
                      src={folder.cover_image_url}
                      alt={folder.name}
                      className="w-full h-full object-cover"
                    />
                  )
                  : folder.location_categories.length > 0 ? (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex flex-wrap gap-2 items-center justify-center p-4">
                      {folder.location_categories.slice(0, 4).map((category: string, idx: number) => (
                        <div key={idx} className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                          <CategoryIcon category={category} className="w-6 h-6" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <Folder className="w-12 h-12 text-primary/40" />
                    </div>
                  )}
                </div>
                
                <div className="p-3 relative">
                  <h3 className="font-semibold text-sm text-foreground truncate pr-8">
                    {folder.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {folder.locations_count || 0} places
                  </p>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/create-list?folderId=${folder.id}`);
                    }}
                    className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Trips */}
            {trips.map((trip) => (
              <div
                key={trip.id}
                className="relative bg-card rounded-xl overflow-hidden shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedTrip(trip)}
              >
                {trip.cover_image_url ? (
                  <div className="aspect-square bg-muted">
                    <img
                      src={trip.cover_image_url}
                      alt={trip.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <MapPin className="w-12 h-12 text-primary/40" />
                  </div>
                )}
                
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {trip.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {trip.trip_locations?.length || 0} places
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleEditTrip(trip);
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrip(trip.id);
                          }}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <CreateTripModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTrip={handleCreateTrip}
      />

      {selectedTrip && (
        <TripDetailModal
          trip={selectedTrip}
          isOpen={!!selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      )}

      {viewingFolderId && (
        <FolderDetailModal
          folderId={viewingFolderId}
          isOpen={!!viewingFolderId}
          onClose={() => setViewingFolderId(null)}
        />
      )}

      {editingFolderId && (
        <FolderEditorPage
          isOpen={!!editingFolderId}
          onClose={() => setEditingFolderId(null)}
          folderId={editingFolderId}
          onFolderSaved={() => {
            loadFolders();
            setEditingFolderId(null);
          }}
        />
      )}

      {showFolderEditor && (
        <FolderEditorPage
          isOpen={showFolderEditor}
          onClose={() => setShowFolderEditor(false)}
          onFolderSaved={() => {
            loadFolders();
            setShowFolderEditor(false);
          }}
        />
      )}

      <Dialog open={!!editingTrip} onOpenChange={(open) => !open && setEditingTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Trip name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
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
    </div>
  );
};

export default TripsGrid;
