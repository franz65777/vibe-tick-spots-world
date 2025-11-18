import { useState, useEffect, useRef } from 'react';
import { X, Plus, Folder, ChevronRight, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import FolderEditorPage from './FolderEditorPage';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface SavedFolder {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  locations_count?: number;
  location_categories?: string[];
}

interface SavedFoldersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelect?: (folderId: string) => void;
  savedLocations?: any[];
}

const FOLDER_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-orange-500',
];

const SavedFoldersDrawer = ({ isOpen, onClose, onFolderSelect, savedLocations = [] }: SavedFoldersDrawerProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [folders, setFolders] = useState<SavedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [mouseStart, setMouseStart] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      loadFolders();
    }
  }, [isOpen, user]);

  const loadFolders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load folders
      const { data, error } = await supabase
        .from('saved_folders')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get location counts and categories for each folder
      const foldersWithDetails = await Promise.all(
        (data || []).map(async (folder: any) => {
          const { data: locations, error: locError } = await supabase
            .from('folder_locations')
            .select(`
              location_id,
              locations (
                category
              )
            `)
            .eq('folder_id', folder.id)
            .limit(4);

          if (locError) console.error('Error loading folder locations:', locError);

          return {
            id: folder.id,
            name: folder.name,
            description: folder.description ?? null,
            color: folder.color ?? null,
            icon: folder.icon ?? null,
            created_at: folder.created_at,
            locations_count: locations?.length || 0,
            location_categories: locations?.map((l: any) => l.locations?.category).filter(Boolean) || []
          };
        })
      );

      setFolders(foldersWithDetails);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error(t('errorLoadingFolders', { ns: 'profile', defaultValue: 'Errore nel caricamento delle cartelle' }));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditor = (folderId?: string) => {
    setEditingFolderId(folderId || null);
    setEditorOpen(true);
  };

  const handleCloseEditor = () => {
    setEditorOpen(false);
    setEditingFolderId(null);
  };

  const handleFolderSaved = () => {
    loadFolders();
  };

  // Swipe gesture handling
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentTouch = e.touches[0].clientX;
    const diff = touchStart - currentTouch;
    
    if (diff > 50) {
      onClose();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setMouseStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diff = mouseStart - e.clientX;
    
    if (diff > 50) {
      setIsDragging(false);
      onClose();
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-[10000] ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        ref={containerRef}
        className={`fixed inset-0 bg-background transition-transform duration-300 z-[10001] flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
          {/* Header */}
          <div className="flex items-center justify-between pl-1 pr-4 py-4 mt-2.5">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-lg font-semibold truncate">
                {t('myFolders', { ns: 'profile', defaultValue: 'Le mie cartelle' })}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">
                  {t('loading', { ns: 'common' })}...
                </div>
              </div>
            ) : folders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Folder className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-2">
                  {t('noFolders', { ns: 'profile', defaultValue: 'Nessuna cartella' })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('createFirstFolder', { ns: 'profile', defaultValue: 'Crea la tua prima cartella' })}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {folders.map((folder) => (
                  <div key={folder.id} className="relative">
                    <button
                      onClick={() => {
                        onFolderSelect?.(folder.id);
                        onClose();
                      }}
                      className="w-full group relative aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 active:scale-95"
                    >
                      <div className={`absolute inset-0 ${folder.color || 'bg-primary'} opacity-80 dark:opacity-60`} />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white dark:text-white/90">
                        {/* Show location category icons preview */}
                        {folder.location_categories && folder.location_categories.length > 0 ? (
                          <div className="flex flex-wrap gap-1 justify-center mb-2">
                            {folder.location_categories.slice(0, 4).map((category, idx) => (
                              <div key={idx} className="bg-white/20 backdrop-blur-sm rounded-lg p-1.5">
                                <CategoryIcon category={category} className="w-5 h-5" />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Folder className="h-12 w-12 mb-2 opacity-90" />
                        )}
                        <p className="font-semibold text-sm line-clamp-2 text-center opacity-95">
                          {folder.name}
                        </p>
                        <p className="text-xs opacity-80 mt-1">
                          {folder.locations_count || 0} {t('locations', { ns: 'common', defaultValue: 'posizioni' })}
                        </p>
                      </div>
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-5 w-5 text-white dark:text-white/80" />
                      </div>
                    </button>
                    {/* Edit button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditor(folder.id);
                      }}
                      className="absolute top-2 right-2 p-2 bg-black/30 hover:bg-black/50 rounded-full transition-colors backdrop-blur-sm z-10"
                      title={t('edit', { ns: 'common', defaultValue: 'Modifica' })}
                    >
                      <Edit2 className="h-4 w-4 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="p-4">
            <Button
              onClick={() => handleOpenEditor()}
              className="w-full rounded-full"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('createFolder', { ns: 'profile', defaultValue: 'Crea cartella' })}
            </Button>
          </div>
        </div>

      {/* Folder Editor */}
      <FolderEditorPage
        isOpen={editorOpen}
        onClose={handleCloseEditor}
        savedLocations={savedLocations}
        folderId={editingFolderId}
        onFolderSaved={handleFolderSaved}
      />
    </>
  );
};

export default SavedFoldersDrawer;
