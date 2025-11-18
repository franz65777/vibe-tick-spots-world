import { useState, useEffect, useRef } from 'react';
import { X, Plus, Folder, ChevronRight, Lock, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  is_private: boolean;
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
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
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

  const handleCreateFolder = async () => {
    if (!user || !folderName.trim()) return;

    try {
      const randomColor = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];

      const { error } = await supabase
        .from('saved_folders')
        .insert({
          user_id: user.id,
          name: folderName.trim(),
          color: randomColor,
          icon: 'folder',
          is_private: isPrivate
        });

      if (error) throw error;

      toast.success(t('folderCreated', { ns: 'profile', defaultValue: 'Cartella creata' }));
      setFolderName('');
      setIsPrivate(false);
      setCreateModalOpen(false);
      loadFolders();
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error(t('errorCreatingFolder', { ns: 'profile', defaultValue: 'Errore nella creazione della cartella' }));
    }
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
                    <div className="absolute top-2 right-2">
                      {folder.is_private ? (
                        <Lock className="h-4 w-4 text-white/80" />
                      ) : (
                        <Globe className="h-4 w-4 text-white/80" />
                      )}
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
              onClick={() => setCreateModalOpen(true)}
              className="w-full"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              {t('createFolder', { ns: 'profile', defaultValue: 'Crea cartella' })}
            </Button>
          </div>
        </div>

      {/* Create Folder Modal */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('createFolder', { ns: 'profile', defaultValue: 'Crea cartella' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                {t('folderName', { ns: 'profile', defaultValue: 'Nome cartella' })}
              </Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={t('enterFolderName', { ns: 'profile', defaultValue: 'es. ❤️ Preferiti, 🍕 Da provare...' })}
                maxLength={50}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is-private">
                  {t('privateFolder', { ns: 'profile', defaultValue: 'Cartella privata' })}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {t('privateFolderDesc', { ns: 'profile', defaultValue: 'Solo tu potrai vedere questa cartella' })}
                </p>
              </div>
              <Switch
                id="is-private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateModalOpen(false)}>
              {t('cancel', { ns: 'common', defaultValue: 'Annulla' })}
            </Button>
            <Button onClick={handleCreateFolder} disabled={!folderName.trim()}>
              {t('create', { ns: 'common', defaultValue: 'Crea' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedFoldersDrawer;
