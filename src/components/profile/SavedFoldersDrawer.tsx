import { useState, useEffect } from 'react';
import { X, Plus, Folder, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SavedFolder {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  created_at: string;
  locations_count?: number;
}

interface SavedFoldersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onFolderSelect?: (folderId: string) => void;
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

const SavedFoldersDrawer = ({ isOpen, onClose, onFolderSelect }: SavedFoldersDrawerProps) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [folders, setFolders] = useState<SavedFolder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadFolders();
    }
  }, [isOpen, user]);

  const loadFolders = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('saved_folders')
        .select(`
          *,
          folder_locations (count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const foldersWithCount = data?.map(folder => ({
        ...folder,
        locations_count: folder.folder_locations?.[0]?.count || 0
      })) || [];

      setFolders(foldersWithCount);
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error(t('errorLoadingFolders', { ns: 'profile', defaultValue: 'Errore nel caricamento delle cartelle' }));
    } finally {
      setLoading(false);
    }
  };

  const createFolder = async () => {
    if (!user) return;

    const folderName = prompt(
      t('enterFolderName', { ns: 'profile', defaultValue: 'Nome della cartella' })
    );

    if (!folderName) return;

    try {
      const randomColor = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];

      const { error } = await supabase
        .from('saved_folders')
        .insert({
          user_id: user.id,
          name: folderName,
          color: randomColor,
          icon: 'folder'
        });

      if (error) throw error;

      toast.success(t('folderCreated', { ns: 'profile', defaultValue: 'Cartella creata' }));
      loadFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(t('errorCreatingFolder', { ns: 'profile', defaultValue: 'Errore nella creazione della cartella' }));
    }
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
        className={`fixed left-0 top-0 h-full w-[85%] max-w-sm bg-background shadow-2xl transition-transform duration-300 z-[10001] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">
              {t('myFolders', { ns: 'profile', defaultValue: 'Le mie cartelle' })}
            </h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
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
                  <button
                    key={folder.id}
                    onClick={() => {
                      onFolderSelect?.(folder.id);
                      onClose();
                    }}
                    className="group relative aspect-square rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-200 active:scale-95"
                  >
                    <div className={`absolute inset-0 ${folder.color || 'bg-primary'} opacity-90`} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-white">
                      <Folder className="h-12 w-12 mb-2" />
                      <p className="font-semibold text-sm line-clamp-2 text-center">
                        {folder.name}
                      </p>
                      <p className="text-xs opacity-90 mt-1">
                        {folder.locations_count || 0} {t('locations', { ns: 'common', defaultValue: 'posizioni' })}
                      </p>
                    </div>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-5 w-5 text-white" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Button */}
          <div className="p-4 border-t border-border">
            <Button
              onClick={createFolder}
              className="w-full"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('createFolder', { ns: 'profile', defaultValue: 'Crea cartella' })}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default SavedFoldersDrawer;
