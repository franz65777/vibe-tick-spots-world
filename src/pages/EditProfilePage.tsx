import { useState } from 'react';
import { ArrowLeft, Save, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const EditProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, updateProfile, refetch } = useProfile();
  const { user } = useAuth();
  const [username, setUsername] = useState(profile?.username || user?.user_metadata?.username || 'user');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
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
      let avatarUrl = profile?.avatar_url;

      // Upload new avatar if selected
      if (avatarFile && user) {
        setIsUploading(true);
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

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
      navigate('/settings');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(t('failedToUpdate', { ns: 'settings' }));
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold">{t('editProfile', { ns: 'settings' })}</h1>
        </div>
        <Button
          onClick={handleSave}
          disabled={isLoading || isUploading || !username.trim()}
          className="gap-2"
        >
          {isLoading || isUploading ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
              {isUploading ? t('uploading', { ns: 'add' }) : t('saving', { ns: 'settings' })}
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {t('save', { ns: 'common' })}
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 py-6">
            <Avatar className="w-32 h-32">
              <AvatarImage src={avatarPreview || undefined} />
              <AvatarFallback className="text-3xl">
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
              
              {(avatarPreview || profile?.avatar_url) && (
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

          {/* Username Field */}
          <div className="space-y-2">
            <label htmlFor="username" className="block text-sm font-medium">
              {t('username', { ns: 'settings' })}
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('usernamePlaceholder', { ns: 'settings' })}
              maxLength={30}
            />
          </div>

          {/* Bio Field */}
          <div className="space-y-2">
            <label htmlFor="bio" className="block text-sm font-medium">
              {t('bio', { ns: 'settings' })}
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              placeholder={t('bioPlaceholder', { ns: 'settings' })}
              maxLength={150}
            />
            <div className="text-xs text-muted-foreground text-right">
              {bio.length}/150
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePage;
