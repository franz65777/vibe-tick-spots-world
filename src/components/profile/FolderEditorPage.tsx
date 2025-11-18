import { useState, useEffect } from 'react';
import { X, Search, Lock, Globe, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CategoryIcon } from '@/components/common/CategoryIcon';

interface FolderEditorPageProps {
  isOpen: boolean;
  onClose: () => void;
  savedLocations?: any[];
  folderId?: string | null;
  onFolderSaved?: () => void;
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

const FolderEditorPage = ({ isOpen, onClose, savedLocations = [], folderId, onFolderSaved }: FolderEditorPageProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const isEditMode = !!folderId;

  useEffect(() => {
    if (isOpen && folderId) {
      loadFolderData();
    } else if (isOpen && !folderId) {
      // Reset for new folder
      setFolderName('');
      setDescription('');
      setIsPrivate(false);
      setSelectedLocationIds([]);
      setSearchQuery('');
    }
  }, [isOpen, folderId]);

  const loadFolderData = async () => {
    if (!folderId || !user) return;

    setLoading(true);
    try {
      // Load folder details
      const { data: folderData, error: folderError } = await supabase
        .from('saved_folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (folderError) throw folderError;

      setFolderName(folderData.name);
      setDescription(folderData.description || '');
      setIsPrivate(folderData.is_private || false);

      // Load folder locations
      const { data: locationData, error: locationError } = await supabase
        .from('folder_locations')
        .select('location_id')
        .eq('folder_id', folderId);

      if (locationError) throw locationError;

      setSelectedLocationIds(locationData.map(l => l.location_id));
    } catch (error) {
      console.error('Error loading folder:', error);
      toast.error(t('errorLoadingFolder', { ns: 'profile', defaultValue: 'Errore nel caricamento della cartella' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !folderName.trim()) return;

    setSaving(true);
    try {
      if (isEditMode) {
        // Update existing folder
        const { error: updateError } = await supabase
          .from('saved_folders')
          .update({
            name: folderName.trim(),
            description: description.trim() || null,
            is_private: isPrivate,
          })
          .eq('id', folderId);

        if (updateError) throw updateError;

        // Delete all existing folder locations
        const { error: deleteError } = await supabase
          .from('folder_locations')
          .delete()
          .eq('folder_id', folderId);

        if (deleteError) throw deleteError;

        // Insert new folder locations
        if (selectedLocationIds.length > 0) {
          const { error: insertError } = await supabase
            .from('folder_locations')
            .insert(
              selectedLocationIds.map((locationId) => ({
                folder_id: folderId,
                location_id: locationId,
              }))
            );

          if (insertError) throw insertError;
        }

        toast.success(t('folderUpdated', { ns: 'profile', defaultValue: 'Cartella aggiornata' }));
      } else {
        // Create new folder
        const randomColor = FOLDER_COLORS[Math.floor(Math.random() * FOLDER_COLORS.length)];

        const { data, error } = await supabase
          .from('saved_folders')
          .insert({
            user_id: user.id,
            name: folderName.trim(),
            description: description.trim() || null,
            color: randomColor,
            icon: 'folder',
            is_private: isPrivate,
          })
          .select('id')
          .single();

        if (error) throw error;

        // Insert folder locations
        if (selectedLocationIds.length > 0) {
          const { error: locationsError } = await supabase
            .from('folder_locations')
            .insert(
              selectedLocationIds.map((locationId) => ({
                folder_id: data.id,
                location_id: locationId,
              }))
            );

          if (locationsError) throw locationsError;
        }

        toast.success(t('folderCreated', { ns: 'profile', defaultValue: 'Cartella creata' }));
      }

      onFolderSaved?.();
      onClose();
    } catch (error) {
      console.error('Error saving folder:', error);
      toast.error(t('errorSavingFolder', { ns: 'profile', defaultValue: 'Errore nel salvataggio della cartella' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!folderId || !user) return;

    const confirmed = window.confirm(t('confirmDeleteFolder', { ns: 'profile', defaultValue: 'Sei sicuro di voler eliminare questa cartella?' }));
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('saved_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      toast.success(t('folderDeleted', { ns: 'profile', defaultValue: 'Cartella eliminata' }));
      onFolderSaved?.();
      onClose();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(t('errorDeletingFolder', { ns: 'profile', defaultValue: 'Errore nell\'eliminazione della cartella' }));
    }
  };

  const toggleLocationSelection = (locationId: string, internalId?: string) => {
    // Use internal location_id (UUID) if available, otherwise use the id
    const idToUse = internalId || locationId;
    setSelectedLocationIds((prev) =>
      prev.includes(idToUse)
        ? prev.filter((id) => id !== idToUse)
        : [...prev, idToUse]
    );
  };

  const filteredLocations = savedLocations.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background z-[10001] flex flex-col pt-[25px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold truncate">
            {isEditMode
              ? t('editFolder', { ns: 'profile', defaultValue: 'Modifica cartella' })
              : t('createFolder', { ns: 'profile', defaultValue: 'Crea cartella' })}
          </h2>
        </div>
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
          title={isPrivate ? t('private', { ns: 'profile', defaultValue: 'Privata' }) : t('public', { ns: 'profile', defaultValue: 'Pubblica' })}
        >
          {isPrivate ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">
              {t('loading', { ns: 'common' })}...
            </div>
          </div>
        ) : (
          <>
            {/* Folder Name */}
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                {t('folderName', { ns: 'profile', defaultValue: 'Nome cartella' })} *
              </Label>
              <Input
                id="folder-name"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder={t('enterFolderName', { ns: 'profile', defaultValue: 'es. ❤️ Preferiti, 🍕 Da provare...' })}
                maxLength={50}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="folder-description">
                {t('folderDescription', { ns: 'profile', defaultValue: 'Descrizione (opzionale)' })}
              </Label>
              <Input
                id="folder-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t('enterFolderDescription', { ns: 'profile', defaultValue: 'Aggiungi una descrizione...' })}
                maxLength={200}
              />
            </div>

            {/* Privacy Status Display */}
            <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-xl">
              {isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              <span className="text-sm">
                {isPrivate
                  ? t('folderPrivateDesc', { ns: 'profile', defaultValue: 'Solo tu puoi vedere questa cartella' })
                  : t('folderPublicDesc', { ns: 'profile', defaultValue: 'Tutti possono vedere questa cartella' })}
              </span>
            </div>

            {/* Locations Section */}
            <div className="space-y-3">
              <Label>
                {t('selectLocationsForFolder', { ns: 'profile', defaultValue: 'Seleziona i luoghi da aggiungere' })}
              </Label>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('searchLocations', { ns: 'profile', defaultValue: 'Cerca luoghi...' })}
                  className="pl-10"
                />
              </div>

              {/* Selected Count */}
              <div className="text-sm text-muted-foreground">
                {selectedLocationIds.length > 0 && (
                  <span>
                    {selectedLocationIds.length} {t('locationsSelected', { ns: 'profile', defaultValue: 'luoghi selezionati' })}
                  </span>
                )}
              </div>

              {/* Locations List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {savedLocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('noSavedLocationsForFolder', { ns: 'profile', defaultValue: 'Non hai ancora luoghi salvati da aggiungere' })}
                  </p>
                ) : filteredLocations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {t('noLocationsFound', { ns: 'profile', defaultValue: 'Nessun luogo trovato' })}
                  </p>
                ) : (
                  filteredLocations.map((place: any) => {
                    // Use internal location_id if available, otherwise use id
                    const idToCheck = place.location_id || place.id;
                    const isSelected = selectedLocationIds.includes(idToCheck);
                    return (
                      <button
                        type="button"
                        key={place.id}
                        onClick={() => toggleLocationSelection(place.id, place.location_id)}
                        className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                          isSelected ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-accent/40'
                        }`}
                      >
                        <div className="shrink-0 bg-muted rounded-xl p-1.5">
                          <CategoryIcon category={place.category} className="w-7 h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{place.name}</p>
                          {place.city && (
                            <p className="text-xs text-muted-foreground truncate">
                              {place.city}
                            </p>
                          )}
                        </div>
                        <div
                          className={`ml-2 h-5 w-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
                          }`}
                        >
                          {isSelected && <span className="text-[10px] font-semibold">✓</span>}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 flex gap-2">
        {isEditMode ? (
          <>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl"
              disabled={saving}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('deleteFolder', { ns: 'profile', defaultValue: 'Elimina cartella' })}
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 rounded-2xl"
              size="lg"
              disabled={!folderName.trim() || saving}
            >
              {saving ? (
                t('saving', { ns: 'common', defaultValue: 'Salvataggio...' })
              ) : (
                t('saveChanges', { ns: 'common', defaultValue: 'Salva modifiche' })
              )}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSave}
            className="w-full rounded-2xl"
            size="lg"
            disabled={!folderName.trim() || saving}
          >
            {saving ? (
              t('saving', { ns: 'common', defaultValue: 'Salvataggio...' })
            ) : (
              <>
                <Plus className="h-5 w-5 mr-2" />
                {t('createFolder', { ns: 'profile', defaultValue: 'Crea cartella' })}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default FolderEditorPage;
