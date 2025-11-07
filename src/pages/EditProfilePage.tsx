import { useState } from 'react';
import { ArrowLeft, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const EditProfilePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, updateProfile, refetch } = useProfile();
  const { user } = useAuth();
  const [username, setUsername] = useState(profile?.username || 'user');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile?.avatar_url || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

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
    if (newUsername === profile?.username) return;
    
    const isAvailable = await checkUsernameAvailability(newUsername.trim());
    if (!isAvailable) {
      setUsernameError(t('usernameNotAvailable', { ns: 'settings' }));
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
      
      // Check if username is changing and if user has reached the limit
      if (isUsernameChanging) {
        const isAvailable = await checkUsernameAvailability(username.trim());
        if (!isAvailable) {
          toast.error(t('usernameNotAvailable', { ns: 'settings' }));
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
        full_name: fullName.trim(),
        bio: bio.trim(),
        avatar_url: avatarUrl
      });

      // Track username change if it changed
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
      <div className="flex items-center p-4 bg-background sticky top-0 z-10">
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold ml-3">{t('editProfile', { ns: 'settings' })}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="max-w-2xl mx-auto p-4 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center gap-4 py-6">
            <Avatar className="w-32 h-32">
              <AvatarImage src={avatarPreview || profile?.avatar_url || undefined} />
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
                  className="rounded-[16px]"
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
                  className="rounded-[16px]"
                  onClick={handleRemoveAvatar}
                  disabled={isLoading || isUploading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('remove', { ns: 'common' })}
                </Button>
              )}
            </div>
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
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background">
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
  );
};

export default EditProfilePage;
