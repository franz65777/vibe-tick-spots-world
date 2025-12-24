import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Lock, Eye, Users, Globe, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PrivacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type BeenCardsVisibility = 'everyone' | 'none' | 'close_friends';

const PrivacyModal: React.FC<PrivacyModalProps> = ({ open, onOpenChange }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isPrivate, setIsPrivate] = useState(false);
  const [beenCardsVisibility, setBeenCardsVisibility] = useState<BeenCardsVisibility>('everyone');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && user?.id) {
      loadPrivacySettings();
    }
  }, [open, user?.id]);

  const loadPrivacySettings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading privacy settings:', error);
        return;
      }

      if (data) {
        setIsPrivate(data.is_private ?? false);
        setBeenCardsVisibility((data.been_cards_visibility as BeenCardsVisibility) ?? 'everyone');
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
      // Determine the actual been cards visibility
      // If profile is private, been cards are only shown to approved followers
      const effectiveBeenVisibility = newIsPrivate ? 'followers' : newBeenCardsVisibility;

      const { error } = await supabase
        .from('user_privacy_settings')
        .upsert({
          user_id: user.id,
          is_private: newIsPrivate,
          been_cards_visibility: newIsPrivate ? 'followers' : newBeenCardsVisibility,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

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
      // When profile becomes private, automatically set been cards to followers only
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-2 border-b sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              {t('privacy', { ns: 'settings', defaultValue: 'Privacy' })}
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(85vh-60px)]">
          <div className="p-4 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
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
                          {t('privateAccountDesc', { ns: 'settings', defaultValue: 'Only approved followers can see your content' })}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={isPrivate}
                      onCheckedChange={handlePrivateToggle}
                      disabled={saving}
                    />
                  </div>
                  {isPrivate && (
                    <div className="ml-13 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      {t('privateAccountInfo', { ns: 'settings', defaultValue: 'When your account is private, only people you approve can see your photos, lists, and saved places.' })}
                    </div>
                  )}
                </div>

                {/* Been Cards Visibility */}
                <div className="space-y-3 pt-2 border-t">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                      <Eye className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">
                        {t('beenCardsVisibility', { ns: 'settings', defaultValue: 'Been Cards Visibility' })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('beenCardsVisibilityDesc', { ns: 'settings', defaultValue: 'Who can see your been cards in the feed' })}
                      </div>
                    </div>
                  </div>

                  {isPrivate ? (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      {t('beenCardsPrivateNote', { ns: 'settings', defaultValue: 'Since your profile is private, your been cards are only visible to your approved followers.' })}
                    </div>
                  ) : (
                    <RadioGroup 
                      value={beenCardsVisibility} 
                      onValueChange={handleBeenCardsVisibilityChange}
                      disabled={saving}
                      className="space-y-3"
                    >
                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="everyone" id="everyone" />
                        <Label htmlFor="everyone" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {t('everyone', { ns: 'settings', defaultValue: 'Everyone' })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t('everyoneDesc', { ns: 'settings', defaultValue: 'Anyone can see your been cards' })}
                            </div>
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="close_friends" id="close_friends" />
                        <Label htmlFor="close_friends" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {t('closeFriendsOnly', { ns: 'settings', defaultValue: 'Close Friends Only' })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t('closeFriendsOnlyDesc', { ns: 'settings', defaultValue: 'Only your close friends can see your been cards' })}
                            </div>
                          </div>
                        </Label>
                      </div>

                      <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                        <RadioGroupItem value="none" id="none" />
                        <Label htmlFor="none" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {t('noOne', { ns: 'settings', defaultValue: 'No One' })}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t('noOneDesc', { ns: 'settings', defaultValue: 'Your been cards are hidden from everyone' })}
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default PrivacyModal;
