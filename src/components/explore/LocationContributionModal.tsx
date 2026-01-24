import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Camera, Plus, ChevronRight, Lock, FolderPlus, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useNearbyPhotos, NearbyPhoto } from '@/hooks/useNearbyPhotos';
import { useNavigate } from 'react-router-dom';

interface LocationContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: {
    id?: string;
    name: string;
    google_place_id?: string;
    latitude?: number;
    longitude?: number;
  };
  onSuccess?: () => void;
}

interface UserFolder {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  is_private: boolean;
  cover_url?: string;
  location_count?: number;
}

const LocationContributionModal: React.FC<LocationContributionModalProps> = ({
  isOpen,
  onClose,
  location,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [selectedPhotos, setSelectedPhotos] = useState<NearbyPhoto[]>([]);
  const [descriptionText, setDescriptionText] = useState('');
  const [userFolders, setUserFolders] = useState<UserFolder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  const [folderNotes, setFolderNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [foldersLoading, setFoldersLoading] = useState(true);
  const [showAllPhotos, setShowAllPhotos] = useState(false);

  // Nearby photos hook
  const {
    nearbyPhotos,
    allPhotos,
    loading: photosLoading,
    scanPhotos,
    clearPhotos,
  } = useNearbyPhotos({
    locationLat: location.latitude || 0,
    locationLng: location.longitude || 0,
    radiusMeters: 500,
  });

  // Fetch user's folders
  useEffect(() => {
    const fetchFolders = async () => {
      if (!user) return;
      setFoldersLoading(true);
      try {
        const { data, error } = await supabase
          .from('saved_folders')
          .select('id, name, icon, color, is_private, cover_image_url')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // Get location counts for each folder
        const foldersWithCounts = await Promise.all(
          (data || []).map(async (folder) => {
            const { count } = await supabase
              .from('folder_locations')
              .select('*', { count: 'exact', head: true })
              .eq('folder_id', folder.id);
            return { 
              ...folder, 
              cover_url: folder.cover_image_url,
              location_count: count || 0 
            };
          })
        );

        setUserFolders(foldersWithCounts);
      } catch (error) {
        console.error('Error fetching folders:', error);
      } finally {
        setFoldersLoading(false);
      }
    };

    if (isOpen) {
      fetchFolders();
    }
  }, [user, isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPhotos([]);
      setDescriptionText('');
      setSelectedFolders(new Set());
      setFolderNotes({});
      setShowAllPhotos(false);
      clearPhotos();
    }
  }, [isOpen, clearPhotos]);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      await scanPhotos(files);
    },
    [scanPhotos]
  );

  const togglePhotoSelection = (photo: NearbyPhoto) => {
    setSelectedPhotos((prev) => {
      const exists = prev.some((p) => p.url === photo.url);
      if (exists) {
        return prev.filter((p) => p.url !== photo.url);
      }
      return [...prev, photo];
    });
  };

  const toggleFolderSelection = (folderId: string) => {
    setSelectedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!user) {
      toast.error(t('auth_required', { ns: 'explore', defaultValue: 'Please sign in to continue' }));
      return;
    }

    const hasContent = selectedPhotos.length > 0 || descriptionText.trim() || selectedFolders.size > 0;
    if (!hasContent) {
      toast.error(t('addSomething', { ns: 'explore', defaultValue: 'Add a photo, a description, or save to a list' }));
      return;
    }

    setLoading(true);

    try {
      let locationId = location.id;

      // Ensure location exists in database
      if (!locationId && location.google_place_id) {
        const { data: existingLocation } = await supabase
          .from('locations')
          .select('id')
          .eq('google_place_id', location.google_place_id)
          .maybeSingle();

        if (existingLocation) {
          locationId = existingLocation.id;
        } else {
          // Create the location
          const { data: newLocation, error: createError } = await supabase
            .from('locations')
            .insert({
              name: location.name,
              google_place_id: location.google_place_id,
              latitude: location.latitude,
              longitude: location.longitude,
              category: 'place',
              created_by: user.id,
            })
            .select('id')
            .single();

          if (createError) throw createError;
          locationId = newLocation.id;
        }
      }

      // Upload photos and create post if we have photos or description
      if (selectedPhotos.length > 0 || descriptionText.trim()) {
        const mediaUrls: string[] = [];

        // Upload selected photos
        for (const photo of selectedPhotos) {
          const fileName = `${user.id}/${Date.now()}-${photo.file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(fileName, photo.file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            continue;
          }

          const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName);
          if (urlData?.publicUrl) {
            mediaUrls.push(urlData.publicUrl);
          }
        }

        // Create post with photos and/or description
        if (mediaUrls.length > 0 || descriptionText.trim()) {
          const { error: postError } = await supabase.from('posts').insert({
            user_id: user.id,
            location_id: locationId,
            caption: descriptionText.trim() || null,
            media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          });

          if (postError) throw postError;
        }
      }

      // Add to selected folders
      if (selectedFolders.size > 0 && locationId) {
        const folderInserts = Array.from(selectedFolders).map((folderId) => ({
          folder_id: folderId,
          location_id: locationId!,
        }));

        const { error: folderError } = await supabase
          .from('folder_locations')
          .upsert(folderInserts, { onConflict: 'folder_id,location_id' });

        if (folderError) throw folderError;
      }

      toast.success(t('contributionSaved', { ns: 'explore', defaultValue: 'Saved!' }));
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error saving contribution:', error);
      toast.error(t('saveFailed', { ns: 'explore', defaultValue: 'Failed to save. Please try again.' }));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateList = () => {
    onClose();
    navigate('/create-list');
  };

  if (!isOpen) return null;

  const displayPhotos = showAllPhotos ? allPhotos : nearbyPhotos;
  const hiddenPhotosCount = allPhotos.length - nearbyPhotos.length;

  const modal = (
    <div className="fixed inset-0 z-[2147483647] flex flex-col bg-background/40 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/30 bg-background/60 backdrop-blur-md">
        <div className="w-10" /> {/* Spacer for centering */}
        <h2 className="text-lg font-bold text-foreground truncate max-w-[60%]">
          {location.name}
        </h2>
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Add Photos Section */}
        <div className="px-4 py-4 border-b border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Camera className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {t('addPhotos', { ns: 'explore', defaultValue: 'add photos' })}
            </span>
          </div>

          {/* Photo Grid */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
            {/* Add Photo Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center hover:border-muted-foreground/50 hover:bg-muted/20 transition-all flex-shrink-0"
            >
              <Plus className="w-6 h-6 text-muted-foreground" />
            </button>

            {/* Loading state */}
            {photosLoading && (
              <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Photo Tiles */}
            {displayPhotos.map((photo) => {
              const isSelected = selectedPhotos.some((p) => p.url === photo.url);
              return (
                <button
                  key={photo.url}
                  onClick={() => togglePhotoSelection(photo)}
                  className={cn(
                    'relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all',
                    isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
                  )}
                >
                  <img
                    src={photo.url}
                    alt="Photo"
                    className="w-full h-full object-cover"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  {/* Distance badge for nearby photos */}
                  {photo.distance !== Infinity && photo.distance < 500 && (
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {Math.round(photo.distance)}m
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Show more photos button */}
          {hiddenPhotosCount > 0 && !showAllPhotos && (
            <button
              onClick={() => setShowAllPhotos(true)}
              className="flex items-center gap-2 mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
              <span>
                {t('weFoundOtherPhotos', {
                  ns: 'explore',
                  count: hiddenPhotosCount,
                  defaultValue: `we found ${hiddenPhotosCount} other photos`,
                })}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Description box (replaces "what did you think") */}
          <div className="mt-4">
            <div className="text-sm font-medium text-muted-foreground mb-2">
              {t('addDescription', { ns: 'explore', defaultValue: 'add a description (optional)' })}
            </div>
            <textarea
              value={descriptionText}
              onChange={(e) => setDescriptionText(e.target.value)}
              placeholder={t('descriptionPlaceholder', { ns: 'explore', defaultValue: 'Write a short description…' })}
              className="w-full rounded-2xl bg-muted/30 border border-border/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none min-h-[88px]"
              rows={3}
            />
          </div>
        </div>

        {/* Add to Curation Section */}
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">
              {t('addToCuration', { ns: 'explore', defaultValue: 'add to a curation' })}
            </span>
            <button
              onClick={handleCreateList}
              className="w-8 h-8 rounded-full bg-muted hover:bg-accent flex items-center justify-center transition-colors"
            >
              <FolderPlus className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Folders List */}
          {foldersLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : userFolders.length === 0 ? (
            <div className="py-6 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                {t('noListsYet', { ns: 'explore', defaultValue: "You don't have any lists yet" })}
              </p>
              <Button variant="outline" size="sm" onClick={handleCreateList}>
                <FolderPlus className="w-4 h-4 mr-2" />
                {t('createList', { ns: 'explore', defaultValue: 'Create a list' })}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {userFolders.map((folder) => {
                const isSelected = selectedFolders.has(folder.id);
                return (
                  <div
                    key={folder.id}
                    className={cn(
                      'flex gap-3 p-3 rounded-2xl transition-all',
                      isSelected
                        ? 'bg-primary/10 border border-primary/30'
                        : 'bg-muted/30 border border-border/30'
                    )}
                  >
                    {/* Folder Cover */}
                    <div
                      className="w-16 h-20 rounded-xl overflow-hidden flex-shrink-0"
                      style={{
                        background: folder.cover_url
                          ? `url(${folder.cover_url}) center/cover`
                          : `linear-gradient(135deg, ${folder.color || '#a78bfa'}, ${
                              folder.color ? folder.color + '99' : '#60a5fa'
                            })`,
                      }}
                    >
                      <div className="w-full h-full bg-gradient-to-t from-black/50 p-2 flex flex-col justify-end">
                        <span className="text-white text-[10px] font-medium line-clamp-2">
                          {folder.name}
                        </span>
                        <span className="text-white/70 text-[9px]">
                          {folder.location_count || 0} {t('places', { ns: 'common', defaultValue: 'places' })}
                        </span>
                      </div>
                    </div>

                    {/* Folder Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        {folder.is_private && <Lock className="w-3 h-3" />}
                        <span>{folder.is_private ? t('private', { defaultValue: 'private' }) : t('public', { defaultValue: 'public' })}</span>
                      </div>

                      <input
                        placeholder={t('addANote', { ns: 'explore', defaultValue: 'add a note' })}
                        value={folderNotes[folder.id] || ''}
                        onChange={(e) =>
                          setFolderNotes((prev) => ({
                            ...prev,
                            [folder.id]: e.target.value,
                          }))
                        }
                        className="w-full text-sm bg-transparent border-b border-border/50 py-1 outline-none placeholder:text-muted-foreground/50"
                      />

                      <button className="flex items-center gap-1 text-xs text-muted-foreground mt-2 hover:text-foreground transition-colors">
                        <LinkIcon className="w-3 h-3" />
                        <span>{t('addLink', { defaultValue: 'add a link' })}</span>
                      </button>
                    </div>

                    {/* Checkbox */}
                    <div className="flex items-center">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleFolderSelection(folder.id)}
                        className="w-5 h-5"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Save Button - Fixed at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border/30 pb-safe">
        <Button
          onClick={handleSave}
          disabled={loading || (!selectedPhotos.length && !descriptionText.trim() && !selectedFolders.size)}
          className="w-full h-12 text-base font-semibold rounded-xl"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            t('save', { ns: 'common', defaultValue: 'save' })
          )}
        </Button>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

export default LocationContributionModal;
