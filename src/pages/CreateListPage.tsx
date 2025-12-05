import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Search, Trash2, Plus, MapPin, Upload } from 'lucide-react';
import lockIcon from '@/assets/lock-icon.png';
import eyeIcon from '@/assets/eye-icon.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CategoryIcon } from '@/components/common/CategoryIcon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { compressImage } from '@/utils/imageUtils';
import { GoogleMapsImportModal } from '@/components/list/GoogleMapsImportModal';

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

interface ImportedPlace {
  name: string;
  address?: string;
  city?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
  category?: string;
}

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [importedPlaces, setImportedPlaces] = useState<ImportedPlace[]>([]);

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
      toast.error(t('createList.errorLoading', { defaultValue: 'Error loading list' }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !folderName.trim()) {
      toast.error(t('createList.nameRequired', { defaultValue: 'List name is required' }));
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

        toast.success(t('createList.listUpdated', { defaultValue: 'List updated' }));
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

        toast.success(t('createList.listCreated', { defaultValue: 'List created' }));
      }

      navigate('/profile?tab=trips');
    } catch (error) {
      console.error('Error saving folder:', error);
      toast.error(t('createList.errorSaving', { defaultValue: 'Error saving list' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!folderId || !user) return;

    const confirmed = window.confirm(t('createList.confirmDelete', { defaultValue: 'Are you sure you want to delete this list?' }));
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('saved_folders')
        .delete()
        .eq('id', folderId);

      if (error) throw error;

      toast.success(t('createList.listDeleted', { defaultValue: 'List deleted' }));
      navigate('/profile?tab=trips');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error(t('createList.errorDeleting', { defaultValue: 'Error deleting list' }));
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
      let fileToUpload = file;
      let fileExt = file.name.split('.').pop()?.toLowerCase();

      if (fileExt === 'heic' || fileExt === 'heif') {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const img = new Image();
          
          const imageUrl = URL.createObjectURL(file);
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });

          canvas.width = img.width;
          canvas.height = img.height;
          ctx?.drawImage(img, 0, 0);
          
          const blob = await new Promise<Blob>((resolve) => {
            canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9);
          });
          
          fileToUpload = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
          fileExt = 'jpg';
          URL.revokeObjectURL(imageUrl);
        } catch (conversionError) {
          console.error('HEIC conversion failed:', conversionError);
          fileToUpload = file;
        }
      }

      if (fileToUpload.size > 3 * 1024 * 1024) {
        try {
          const compressed = await compressImage(fileToUpload, 1600, 0.8);
          fileToUpload = compressed;
          fileExt = compressed.name.split('.').pop()?.toLowerCase() || fileExt;
        } catch (compressionError) {
          console.error('Cover image compression failed:', compressionError);
        }
      }

      const fileName = `${user.id}-${Date.now()}.${fileExt || 'jpg'}`;
      const filePath = `folder-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, fileToUpload);

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      setCoverImageUrl(publicUrl);
      toast.success(t('createList.coverUploaded', { defaultValue: 'Cover image uploaded' }));
    } catch (error: any) {
      console.error('Error uploading cover image:', error);
      const message = error?.message || t('createList.errorUploadingCover', { defaultValue: 'Error uploading image' });
      toast.error(message);
    } finally {
      setUploadingCover(false);
    }
  };

  const handleImportPlaces = (places: ImportedPlace[]) => {
    setImportedPlaces(prev => [...prev, ...places]);
  };

  const filteredLocations = savedLocations.filter(place =>
    place.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    place.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[10001] flex flex-col bg-gradient-to-b from-background via-background to-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 pt-safe">
        <button
          onClick={() => navigate('/add')}
          className="p-2 hover:bg-accent/50 rounded-full transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold">
          {isEditMode
            ? t('createList.editList', { defaultValue: 'Edit List' })
            : t('createList.createNewList', { defaultValue: 'Create New List' })}
        </h2>
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className="p-2 hover:bg-accent/50 rounded-full transition-colors"
          title={isPrivate ? t('profile:private', { defaultValue: 'Private' }) : t('profile:public', { defaultValue: 'Public' })}
        >
          {isPrivate ? (
            <img src={lockIcon} alt="Private" className="h-5 w-5" />
          ) : (
            <img src={eyeIcon} alt="Public" className="h-5 w-8" />
          )}
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">
                {t('common:loading', { defaultValue: 'Loading' })}...
              </div>
            </div>
          ) : (
            <>
              {/* Google Maps Import Card */}
              {!isEditMode && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="w-full glass-card rounded-2xl p-4 flex items-center gap-4 hover:scale-[1.02] transition-transform"
                >
                  <div className="w-14 h-14 rounded-xl bg-white shadow-md flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 48 48" className="w-10 h-10">
                      <path fill="#48b564" d="M35.76,26.36h0.01c0,0-3.77,5.53-6.94,9.64c-2.74,3.55-3.54,6.59-3.77,8.06	C24.97,44.6,24.53,45,24,45s-0.97-0.4-1.06-0.94c-0.23-1.47-1.03-4.51-3.77-8.06c-0.42-0.55-0.85-1.12-1.28-1.7L28.24,22l8.33-9.88	C37.49,14.05,38,16,38,18C38,21.09,37.2,23.97,35.76,26.36z"/>
                      <path fill="#fcc60e" d="M28.24,22L17.89,34.3c-2.82-3.78-5.66-7.94-5.66-7.94h0.01c-0.3-0.48-0.57-0.97-0.8-1.48L19.76,15	c-0.79,0.95-1.26,2.17-1.26,3.5c0,3.04,2.46,5.5,5.5,5.5C25.71,24,27.24,23.22,28.24,22z"/>
                      <path fill="#2c85eb" d="M28.4,4.74l-8.57,10.18L13.27,9.2C15.83,6.02,19.69,4,24,4C25.54,4,27.02,4.26,28.4,4.74z"/>
                      <path fill="#ed5748" d="M19.83,14.92L28.4,4.74c3.84,1.29,7.01,4.09,8.76,7.7c0.21,0.44,0.4,0.88,0.56,1.34L24,24c-3.04,0-5.5-2.46-5.5-5.5	C18.5,17.09,18.97,15.87,19.76,14.92z"/>
                    </svg>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-base">
                      {t('createList.importFromGoogleMaps', { defaultValue: 'Import from Google Maps' })}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('createList.importFromGoogleMapsDesc', { defaultValue: 'Import your saved lists from Google Maps' })}
                    </p>
                  </div>
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </button>
              )}

              {/* List Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('createList.listName', { defaultValue: 'List name' })} *
                </label>
                <Input
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  placeholder={t('createList.listNamePlaceholder', { defaultValue: 'e.g. ❤️ Favorites, 🍕 To try...' })}
                  maxLength={50}
                  className="h-12 rounded-xl bg-gray-100/80 dark:bg-slate-800/80 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('createList.description', { defaultValue: 'Description (optional)' })}
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('createList.descriptionPlaceholder', { defaultValue: 'Add a description...' })}
                  maxLength={200}
                  className="h-12 rounded-xl bg-gray-100/80 dark:bg-slate-800/80 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                />
              </div>

              {/* Cover Image */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('createList.coverImage', { defaultValue: 'Cover image (optional)' })}
                </label>
                {coverImageUrl ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                    <img src={coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setCoverImageUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="block cursor-pointer">
                    <div className="h-24 rounded-xl bg-gray-100/80 dark:bg-slate-800/80 border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2 hover:border-primary/30 transition-colors">
                      {uploadingCover ? (
                        <span className="text-sm text-muted-foreground">
                          {t('createList.uploading', { defaultValue: 'Uploading...' })}
                        </span>
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {t('createList.uploadImage', { defaultValue: 'Upload image' })}
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*,.heic,.heif"
                      onChange={handleCoverImageUpload}
                      className="hidden"
                      disabled={uploadingCover}
                    />
                  </label>
                )}
              </div>

              {/* Privacy Status */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-100/80 dark:bg-slate-800/80">
                {isPrivate ? (
                  <img src={lockIcon} alt="Private" className="h-5 w-5" />
                ) : (
                  <img src={eyeIcon} alt="Public" className="h-5 w-7" />
                )}
                <span className="text-sm">
                  {isPrivate
                    ? t('createList.privateList', { defaultValue: 'Only you can see this list' })
                    : t('createList.publicList', { defaultValue: 'Everyone can see this list' })}
                </span>
              </div>

              {/* Imported Places */}
              {importedPlaces.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-muted-foreground">
                      {t('createList.importedPlaces', { defaultValue: 'Imported places' })}
                    </label>
                    <span className="text-xs text-primary font-medium">
                      {importedPlaces.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {importedPlaces.map((place, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 rounded-xl bg-primary/5 border border-primary/20 px-3 py-3"
                      >
                        <div className="shrink-0 bg-primary/10 rounded-xl p-2">
                          <MapPin className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{place.name}</p>
                          {place.city && (
                            <p className="text-xs text-muted-foreground truncate">
                              {place.city}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => setImportedPlaces(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Locations Section */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-muted-foreground">
                  {t('createList.selectPlaces', { defaultValue: 'Select places to add' })}
                </label>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('createList.searchPlaces', { defaultValue: 'Search places...' })}
                    className="pl-10 h-11 rounded-xl bg-gray-100/80 dark:bg-slate-800/80 border-0 focus-visible:ring-1 focus-visible:ring-primary/30"
                  />
                </div>

                {/* Selected Count */}
                {selectedLocationIds.length > 0 && (
                  <div className="text-sm text-primary font-medium">
                    {t('createList.placesSelected', { 
                      defaultValue: '{{count}} places selected',
                      count: selectedLocationIds.length 
                    })}
                  </div>
                )}

                {/* Locations List */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {savedLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('createList.noSavedPlaces', { defaultValue: 'You have no saved places to add yet' })}
                    </p>
                  ) : filteredLocations.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {t('createList.noPlacesFoundSearch', { defaultValue: 'No places found' })}
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
                          className={`w-full flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all ${
                            isSelected 
                              ? 'bg-primary/10 border border-primary/30' 
                              : 'bg-gray-100/80 dark:bg-slate-800/80 border border-transparent hover:border-primary/20'
                          }`}
                        >
                          <div className="shrink-0 bg-muted rounded-xl p-1.5">
                            <CategoryIcon category={place.category} className="w-6 h-6" />
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
                            className={`ml-2 h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected 
                                ? 'border-primary bg-primary text-primary-foreground' 
                                : 'border-muted-foreground/30'
                            }`}
                          >
                            {isSelected && <span className="text-[10px] font-bold">✓</span>}
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
      <div className="p-4 pb-safe flex gap-3">
        {isEditMode ? (
          <>
            <Button
              onClick={handleDelete}
              variant="outline"
              className="flex-1 h-14 rounded-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              disabled={saving}
              size="lg"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              {t('createList.delete', { defaultValue: 'Delete' })}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !folderName.trim()}
              className="flex-1 h-14 rounded-full text-lg font-semibold"
              size="lg"
            >
              {saving 
                ? t('createList.saving', { defaultValue: 'Saving...' }) 
                : t('createList.save', { defaultValue: 'Save' })}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving || !folderName.trim()}
            className="w-full h-14 rounded-full text-lg font-semibold"
            size="lg"
          >
            {saving 
              ? t('createList.creating', { defaultValue: 'Creating...' }) 
              : t('createList.create', { defaultValue: 'Create' })}
          </Button>
        )}
      </div>

      {/* Google Maps Import Modal */}
      <GoogleMapsImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImportPlaces}
      />
    </div>
  );
};

export default CreateListPage;
