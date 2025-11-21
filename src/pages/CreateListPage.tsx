import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Search, Lock, Globe, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { ScrollArea } from '@/components/ui/scroll-area';

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

const CreateListPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const folderId = searchParams.get('folderId');
  
  const [folderName, setFolderName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);

  const isEditMode = !!folderId;

  useEffect(() => {
    loadSavedLocations();
    if (folderId) {
      loadFolderData();
    }
  }, [folderId]);

  const loadSavedLocations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_saved_locations')
        .select(`
          id,
          location_id,
          locations (
            id,
            name,
            category,
            city,
            image_url
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const locations = data
        ?.map((sl: any) => ({
          ...sl.locations,
          location_id: sl.location_id
        }))
        .filter(Boolean) || [];
      
      setSavedLocations(locations);
    } catch (error) {
      console.error('Error loading saved locations:', error);
    }
  };

  const loadFolderData = async () => {
    if (!folderId || !user) return;

    setLoading(true);
    try {
      const { data: folderData, error: folderError } = await supabase
        .from('saved_folders')
        .select('*')
        .eq('id', folderId)
        .single();

      if (folderError) throw folderError;

      setFolderName(folderData.name);
      setDescription(folderData.description || '');
      setIsPrivate(folderData.is_private || false);
      setCoverImageUrl(folderData.cover_image_url || '');

      const { data: locationData, error: locationError } = await supabase
        .from('folder_locations')
        .select('location_id')
        .eq('folder_id', folderId);

      if (locationError) throw locationError;

      setSelectedLocationIds(locationData.map(l => l.location_id));
    } catch (error) {
      console.error('Error loading folder:', error);
      toast.error(t('profile:errorLoadingFolder', { defaultValue: 'Errore nel caricamento della cartella' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !folderName.trim()) {
      toast.error(t('profile:folderNameRequired', { defaultValue: 'Il nome della lista è obbligatorio' }));
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('saved_folders')
          .update({
            name: folderName.trim(),
            description: description.trim() || null,
            is_private: isPrivate,
            cover_image_url: coverImageUrl || null,
          })
          .eq('id', folderId);

        if (updateError) throw updateError;

        const { error: deleteError } = await supabase
          .from('folder_locations')
          .delete()
          .eq('folder_id', folderId);

        if (deleteError) throw deleteError;

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

        toast.success(t('profile:folderUpdated', { defaultValue: 'Lista aggiornata' }));
      } else {
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
            cover_image_url: coverImageUrl || null,
          })
          .select('id')
          .single();

        if (error) throw error;

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

        toast.success(t('profile:folderCreated', { defaultValue: 'Lista creata' }));
      }

      navigate('/profile?tab=trips');
    } catch (error) {
      console.error('Error saving folder:', error);
      toast.error(t('profile:errorSavingFolder', { defaultValue: 'Errore nel salvataggio della lista' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!folderId || !user) return;

    const confirmed = window.confirm(t('profile:confirmDeleteFolder', { defaultValue: 'Sei sicuro di voler eliminare questa lista?' }));
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('saved_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      toast.success(t('profile:folderDeleted', { defaultValue: 'Lista eliminata' }));
      navigate('/profile?tab=trips');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(t('profile:errorDeletingFolder', { defaultValue: 'Errore nell\'eliminazione della lista' }));
    }
  };

  const toggleLocationSelection = (locationId: string, internalId?: string) => {
    const idToUse = internalId || locationId;
    setSelectedLocationIds((prev) =>
      prev.includes(idToUse)
        ? prev.filter((id) => id !== idToUse)
        : [...prev, idToUse]
    );
  };

  const handleCoverImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploadingCover(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `folder-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setCoverImageUrl(publicUrl);
      toast.success(t('profile:coverImageUploaded', { defaultValue: 'Immagine di copertina caricata' }));
    } catch (error) {
      console.error('Error uploading cover image:', error);
      toast.error(t('profile:errorUploadingCover', { defaultValue: 'Errore nel caricamento dell\'immagine' }));
    } finally {
      setUploadingCover(false);
    }
  };

  const filteredLocations = savedLocations.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-background z-[10001] flex flex-col pt-[25px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => navigate('/profile?tab=trips')}
            className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-semibold truncate">
            {isEditMode
              ? t('profile:editFolder', { defaultValue: 'Modifica lista' })
              : t('profile:createFolder', { defaultValue: 'Crea lista' })}
          </h2>
        </div>
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className="p-2 hover:bg-accent rounded-full transition-colors flex-shrink-0"
          title={isPrivate ? t('profile:private', { defaultValue: 'Privata' }) : t('profile:public', { defaultValue: 'Pubblica' })}
        >
          {isPrivate ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">
                {t('common:loading', { defaultValue: 'Caricamento' })}...
              </div>
            </div>
          ) : (
            <>
              {/* Folder Name */}
              <div className="space-y-2">
                <Label htmlFor="folder-name">
                  {t('profile:folderName', { defaultValue: 'Nome lista' })} *
                </Label>
                <Input
                  id="folder-name"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder={t('profile:enterFolderName', { defaultValue: 'es. ❤️ Preferiti, 🍕 Da provare...' })}
                  maxLength={50}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="folder-description">
                  {t('profile:folderDescription', { defaultValue: 'Descrizione (opzionale)' })}
                </Label>
                <Input
                  id="folder-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('profile:enterFolderDescription', { defaultValue: 'Aggiungi una descrizione...' })}
                  maxLength={200}
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <Label htmlFor="cover-image">
                  {t('profile:coverImage', { defaultValue: 'Immagine di copertina (opzionale)' })}
                </Label>
                {coverImageUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setCoverImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <label htmlFor="cover-image" className="block">
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors">
                    {uploadingCover ? (
                      <div className="text-sm text-muted-foreground">
                        {t('common:uploading', { defaultValue: 'Caricamento...' })}
                      </div>
                    ) : (
                      <>
                        <Plus className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {t('profile:uploadCoverImage', { defaultValue: 'Carica immagine' })}
                        </p>
                      </>
                    )}
                  </div>
                  <input
                    id="cover-image"
                    type="file"
                    accept="image/*"
                    onChange={handleCoverImageUpload}
                    className="hidden"
                    disabled={uploadingCover}
                  />
                </label>
              </div>

              {/* Privacy Status Display */}
              <div className="flex items-center gap-2 p-3 bg-accent/50 rounded-xl">
                {isPrivate ? <Lock className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
                <span className="text-sm">
                  {isPrivate
                    ? t('profile:folderPrivateDesc', { defaultValue: 'Solo tu puoi vedere questa lista' })
                    : t('profile:folderPublicDesc', { defaultValue: 'Tutti possono vedere questa lista' })}
                </span>
              </div>

              {/* Locations Section */}
              <div className="space-y-3">
                <Label>
                  {t('profile:selectLocationsForFolder', { defaultValue: 'Seleziona i luoghi da aggiungere' })}
                </Label>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('profile:searchLocations', { defaultValue: 'Cerca luoghi...' })}
                    className="pl-10"
                  />
                </div>

                {/* Selected Count */}
                <div className="text-sm text-muted-foreground">
                  {selectedLocationIds.length > 0 && (
                    <span>
                      {selectedLocationIds.length} {t('profile:locationsSelected', { defaultValue: 'luoghi selezionati' })}
                    </span>
                  )}
                </div>

                {/* Locations List */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {savedLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('profile:noSavedLocationsForFolder', { defaultValue: 'Non hai ancora luoghi salvati da aggiungere' })}
                    </p>
                  ) : filteredLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('profile:noLocationsFound', { defaultValue: 'Nessun luogo trovato' })}
                    </p>
                  ) : (
                    filteredLocations.map((place: any) => {
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
      </ScrollArea>

      {/* Footer Actions */}
      <div className="p-4 flex gap-2">
        {isEditMode ? (
          <>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="flex-1 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-2xl h-12"
              disabled={saving}
              size="lg"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('common:delete', { defaultValue: 'Elimina' })}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !folderName.trim()}
              className="flex-1 rounded-2xl h-12"
              size="lg"
            >
              {saving ? t('common:saving', { defaultValue: 'Salvataggio...' }) : t('common:save', { defaultValue: 'Salva' })}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving || !folderName.trim()}
            className="w-full rounded-2xl h-12"
            size="lg"
          >
            {saving ? t('common:saving', { defaultValue: 'Salvataggio...' }) : t('profile:createList', { defaultValue: 'Crea lista' })}
          </Button>
        )}
      </div>
    </div>
  );
};

export default CreateListPage;
