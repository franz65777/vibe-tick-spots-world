
import { useState } from 'react';
import { X, Save, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfile: any;
}

const EditProfileModal = ({ isOpen, onClose, currentProfile }: EditProfileModalProps) => {
  const { t } = useTranslation();
  const { updateProfile, refetch } = useProfile();
  const { user } = useAuth();
  const [username, setUsername] = useState(currentProfile?.username || user?.user_metadata?.username || 'user');
  const [bio, setBio] = useState(currentProfile?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentProfile?.avatar_url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

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

    setAvatarFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = async () => {
    try {
      setIsLoading(true);
      await updateProfile({ avatar_url: null });
      setAvatarPreview(null);
      setAvatarFile(null);
      await refetch();
      toast.success(t('avatarRemoved', { ns: 'settings' }));
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error(t('failedToRemoveAvatar', { ns: 'settings' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      let avatarUrl = currentProfile?.avatar_url;

      // Upload new avatar if selected
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
        bio: bio.trim(),
        avatar_url: avatarUrl
      });

      await refetch();
      toast.success(t('profileUpdated', { ns: 'settings' }));
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('failedToUpdate', { ns: 'settings' }));
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl w-full max-w-md shadow-xl border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{t('editProfile', { ns: 'settings' })}</h2>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3 pb-4 border-b border-border">
            <Avatar className="w-24 h-24">
              <AvatarImage src={avatarPreview || undefined} />
              <AvatarFallback className="text-xl">
                {username.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex gap-2">
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={isLoading || isUploading}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  disabled={isLoading || isUploading}
                  onClick={() => document.querySelector('input[type="file"]')?.dispatchEvent(new MouseEvent('click'))}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {t('upload', { ns: 'common' })}
                </Button>
              </label>
              
              {(avatarPreview || currentProfile?.avatar_url) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveAvatar}
                  disabled={isLoading || isUploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('remove', { ns: 'common' })}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {t('avatarRequirements', { ns: 'settings' })}
            </p>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              {t('username', { ns: 'settings' })}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('usernamePlaceholder', { ns: 'settings' })}
              maxLength={30}
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              {t('bio', { ns: 'settings' })}
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder={t('bioPlaceholder', { ns: 'settings' })}
              maxLength={150}
            />
            <div className="text-xs text-muted-foreground mt-1 text-right">
              {bio.length}/150
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-border">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading || isUploading}
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1"
            disabled={isLoading || isUploading || !username.trim()}
          >
            {isLoading || isUploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                {isUploading ? t('uploading', { ns: 'add' }) : t('saving', { ns: 'settings' })}
              </div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t('saveChanges', { ns: 'settings' })}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
