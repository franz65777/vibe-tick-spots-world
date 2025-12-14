import { useState, useEffect, useRef } from 'react';
import { Upload, ArrowLeft } from 'lucide-react';
import deleteIcon from '@/assets/icon-delete-new.png';
import editProfileIcon from '@/assets/settings-edit-profile.png';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AvatarCropEditor } from './AvatarCropEditor';
import { useQueryClient } from '@tanstack/react-query';

interface EditProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { profile, updateProfile, refetch } = useProfile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState(profile?.username || 'user');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [showCropEditor, setShowCropEditor] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update fields when profile loads
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || 'user');
      setFullName(profile.full_name || '');
      setBio(profile.bio || '');
      setAvatarPreview(profile.avatar_url || null);
    }
  }, [profile]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error(t('invalidImageType', { ns: 'settings' }));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('imageTooLarge', { ns: 'settings' }));
      return;
    }

    // Open crop editor instead of directly setting the preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempImageForCrop(reader.result as string);
      setShowCropEditor(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    // Convert blob to file
    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' });
    setAvatarFile(file);

    // Create preview URL immediately
    const previewUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(previewUrl);

    // Auto-upload and update profile so user doesn't need to press Save again
    if (!user?.id) return;
    try {
      setIsUploading(true);
      const fileName = `avatar-${Date.now()}.jpg`;
      const filePath = `${user.id}/avatar/${fileName}`; // matches RLS policy first segment = userId

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      await updateProfile({ avatar_url: publicUrl });
      await refetch();
      // Invalidate profile cache globally so nav avatar updates
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(t('profileUpdated', { ns: 'settings' }));
    } catch (e) {
      console.error('Error uploading cropped avatar:', e);
      toast.error(t('failedToUpdate', { ns: 'settings' }));
    } finally {
      setIsUploading(false);
    }

    setShowCropEditor(false);
    setTempImageForCrop(null);
  };

  const handleCropCancel = () => {
    setShowCropEditor(false);
    setTempImageForCrop(null);
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsLoading(true);
      await updateProfile({ avatar_url: null });
      setAvatarPreview(null);
      setAvatarFile(null);
      await refetch();
      // Invalidate all profile queries to update everywhere including nav bar
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(t('avatarRemoved', { ns: 'settings' }));
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error(t('failedToRemoveAvatar', { ns: 'settings' }));
    } finally {
      setIsLoading(false);
    }
  };

  const checkUsernameAvailability = async (newUsername: string): Promise<boolean> => {
    if (newUsername === profile?.username) return true;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', newUsername)
      .single();
    
    return !data && error?.code === 'PGRST116';
  };

  const checkUsernameChangeLimit = async (): Promise<{ allowed: boolean; count: number }> => {
    if (!user?.id) return { allowed: false, count: 0 };
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data, error } = await supabase
      .from('username_changes')
      .select('id')
      .eq('user_id', user.id)
      .gte('changed_at', thirtyDaysAgo.toISOString());
    
    if (error) {
      console.error('Error checking username changes:', error);
      return { allowed: true, count: 0 };
    }
    
    const count = data?.length || 0;
    return { allowed: count < 2, count };
  };

  const handleUsernameChange = async (newUsername: string) => {
    setUsername(newUsername);
    setUsernameError(null);
    
    if (newUsername.trim() === '') return;
    if (newUsername.trim() === profile?.username) return;
    
    const isAvailable = await checkUsernameAvailability(newUsername.trim());
    if (!isAvailable) {
      setUsernameError(t('usernameAlreadyTaken', { ns: 'settings' }));
    }
  };

  const handleSave = async () => {
    if (usernameError) {
      toast.error(usernameError);
      return;
    }

    setIsLoading(true);
    try {
      const isUsernameChanging = username.trim() !== profile?.username;
      
      if (isUsernameChanging) {
        const isAvailable = await checkUsernameAvailability(username.trim());
        if (!isAvailable) {
          toast.error(t('usernameAlreadyTaken', { ns: 'settings' }));
          setIsLoading(false);
          return;
        }

        const { allowed, count } = await checkUsernameChangeLimit();
        if (!allowed) {
          toast.error(t('usernameChangeLimitReached', { ns: 'settings' }));
          setIsLoading(false);
          return;
        }
      }

      let avatarUrl = profile?.avatar_url;

      if (avatarFile && user) {
        setIsUploading(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `${user.id}/avatar/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
        setIsUploading(false);
      }

      await updateProfile({
        username: username.trim(),
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl
      });

      if (isUsernameChanging && user?.id && profile?.username) {
        await supabase
          .from('username_changes')
          .insert({
            user_id: user.id,
            old_username: profile.username,
            new_username: username.trim()
          });
      }

      await refetch();
      // Invalidate all profile queries to update everywhere including nav bar
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success(t('profileUpdated', { ns: 'settings' }));
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('failedToUpdate', { ns: 'settings' }));
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <>
      {showCropEditor && tempImageForCrop && (
        <AvatarCropEditor
          image={tempImageForCrop}
          onComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
      
      <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="pt-[calc(env(safe-area-inset-top)+8px)] p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <SheetTitle className="text-lg font-semibold flex items-center gap-3">
                <img src={editProfileIcon} alt="" className="w-10 h-8 object-contain" />
                {t('editProfile', { ns: 'settings' })}
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto pb-4">
            <div className="max-w-2xl mx-auto p-4 space-y-4">
              {/* Avatar Section */}
              <div className="flex flex-col items-center gap-2 py-1">
                <button
                  type="button"
                  aria-label={t('upload')}
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 relative group"
                >
                  <Avatar className="w-32 h-32 cursor-pointer">
                    <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} alt={t('profile', { ns: 'common' }) || 'Profile'} />
                    <AvatarFallback className="text-3xl">
                      {username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ''; }}
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading || isUploading}
                />

                {/* Remove avatar button - below the photo */}
                {(avatarPreview || profile?.avatar_url) && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="flex items-center gap-2 text-destructive hover:text-destructive/80 transition-colors"
                    aria-label="Rimuovi avatar"
                    disabled={isLoading || isUploading}
                  >
                    <img src={deleteIcon} alt="" className="w-9 h-9" />
                    <span className="text-sm">Rimuovi</span>
                  </button>
                )}
              </div>

              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="fullName" className="block text-sm font-medium">
                  {t('name', { ns: 'settings' })}
                </label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t('namePlaceholder', { ns: 'settings' })}
                  maxLength={50}
                />
              </div>

              {/* Username Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium">
                  {t('username', { ns: 'settings' })}
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder={t('usernamePlaceholder', { ns: 'settings' })}
                  maxLength={30}
                  className={usernameError ? 'border-destructive' : ''}
                />
                {usernameError && (
                  <p className="text-xs text-destructive">{usernameError}</p>
                )}
              </div>

              {/* Bio Field */}
              <div className="space-y-2">
                <label htmlFor="bio" className="block text-sm font-medium">
                  {t('bio', { ns: 'settings' })}
                </label>
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder={t('bioPlaceholder', { ns: 'settings' })}
                  maxLength={150}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {bio.length}/150
                </div>
              </div>
            </div>
          </div>

          {/* Save Button - Fixed at bottom */}
          <div className="p-4 bg-background">
            <Button
              onClick={handleSave}
              disabled={isLoading || isUploading || !username.trim() || !!usernameError}
              className="w-full rounded-[16px] h-12"
            >
              {isLoading || isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
                  {isUploading ? t('uploading', { ns: 'add' }) : t('saving', { ns: 'settings' })}
                </>
              ) : (
                t('save', { ns: 'common' })
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
};

export default EditProfileModal;
