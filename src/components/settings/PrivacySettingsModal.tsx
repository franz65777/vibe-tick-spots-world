import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Eye, ArrowLeft } from 'lucide-react';
import privacyIcon from '@/assets/icons/privacy-icon.png';

type BeenCardsVisibility = 'everyone' | 'none' | 'close_friends';

interface PrivacySettings {
  id: string;
  user_id: string;
  is_private: boolean;
  been_cards_visibility: string;
  created_at: string;
  updated_at: string;
}

interface PrivacySettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PrivacySettingsModal: React.FC<PrivacySettingsModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [beenCardsVisibility, setBeenCardsVisibility] = useState<BeenCardsVisibility>('everyone');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      void loadPrivacySettings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const loadPrivacySettings = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_privacy_settings' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading privacy settings:', error);
        return;
      }

      if (data) {
        const settings = data as unknown as PrivacySettings;
        setIsPrivate(settings.is_private ?? false);
        setBeenCardsVisibility((settings.been_cards_visibility as BeenCardsVisibility) ?? 'everyone');
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePrivacySettings = async (newIsPrivate: boolean, newBeenCardsVisibility: BeenCardsVisibility) => {
    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_privacy_settings' as any)
        .upsert(
          {
            user_id: user.id,
            is_private: newIsPrivate,
            been_cards_visibility: newIsPrivate ? 'followers' : newBeenCardsVisibility,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      toast.success(t('privacySettingsSaved', { ns: 'settings', defaultValue: 'Privacy settings saved' }));
    } catch (error) {
      console.error('Error saving privacy settings:', error);
      toast.error(t('failedToSavePrivacy', { ns: 'settings', defaultValue: 'Failed to save privacy settings' }));
    } finally {
      setSaving(false);
    }
  };

  const handlePrivateToggle = async (checked: boolean) => {
    setIsPrivate(checked);
    if (checked) {
      setBeenCardsVisibility('close_friends');
    }
    await savePrivacySettings(checked, checked ? 'close_friends' : beenCardsVisibility);
  };

  const handleBeenCardsVisibilityChange = async (value: string) => {
    const newValue = value as BeenCardsVisibility;
    setBeenCardsVisibility(newValue);
    await savePrivacySettings(isPrivate, newValue);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-full p-0 [&>button]:hidden">
        <div className="h-full flex flex-col">
          <SheetHeader className="pt-12 p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <SheetTitle className="flex items-center gap-2">
                <img src={privacyIcon} alt="" className="w-6 h-6 object-contain" />
                {t('privacy', { ns: 'settings', defaultValue: 'Privacy' })}
              </SheetTitle>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 pb-24">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Private Account Toggle */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">
                          {t('privateAccount', { ns: 'settings', defaultValue: 'Private Account' })}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t('privateAccountDesc', {
                            ns: 'settings',
                            defaultValue: 'Only approved followers can see your content',
                          })}
                        </div>
                      </div>
                    </div>
                    <Switch checked={isPrivate} onCheckedChange={handlePrivateToggle} disabled={saving} />
                  </div>
                  {isPrivate && (
                    <div className="ml-13 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      {t('privateAccountInfo', {
                        ns: 'settings',
                        defaultValue:
                          'When your account is private, only people you approve can see your photos, lists, and saved places.',
                      })}
                    </div>
                  )}
                </div>

                {/* Visited Places Visibility */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {t('beenCardsVisibility', { ns: 'settings', defaultValue: 'Visited Places Visibility' })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('beenCardsVisibilityDesc', {
                          ns: 'settings',
                          defaultValue: 'Who can see your visited places in the feed',
                        })}
                      </div>
                    </div>
                  </div>

                  <RadioGroup
                    value={beenCardsVisibility}
                    onValueChange={handleBeenCardsVisibilityChange}
                    disabled={saving}
                    className="space-y-1"
                  >
                    {!isPrivate && (
                      <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="everyone" id="everyone" />
                        <Label htmlFor="everyone" className="cursor-pointer flex-1">
                          <div className="font-medium">
                            {t('everyone', { ns: 'settings', defaultValue: 'Everyone' })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t('everyoneDesc', { ns: 'settings', defaultValue: 'Anyone can see your visited places' })}
                          </div>
                        </Label>
                      </div>
                    )}

                    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="close_friends" id="close_friends" />
                      <Label htmlFor="close_friends" className="cursor-pointer flex-1">
                        <div className="font-medium">
                          {t('closeFriendsOnly', { ns: 'settings', defaultValue: 'Close Friends Only' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('closeFriendsOnlyDesc', {
                            ns: 'settings',
                            defaultValue: 'Only your close friends can see your visited places',
                          })}
                        </div>
                      </Label>
                    </div>

                    <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                      <RadioGroupItem value="none" id="none" />
                      <Label htmlFor="none" className="cursor-pointer flex-1">
                        <div className="font-medium">{t('noOne', { ns: 'settings', defaultValue: 'No One' })}</div>
                        <div className="text-xs text-muted-foreground">
                          {t('noOneDesc', {
                            ns: 'settings',
                            defaultValue: 'Your visited places are hidden from everyone',
                          })}
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default PrivacySettingsModal;
