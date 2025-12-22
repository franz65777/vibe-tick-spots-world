import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ArrowLeft, Shield, LogOut } from 'lucide-react';
import editProfileIcon from '@/assets/settings-edit-profile.png';
import languageIcon from '@/assets/settings-language.png';
import businessIcon from '@/assets/settings-business.png';
import notificationsIcon from '@/assets/icon-notification-bell.png';
import closeFriendsIcon from '@/assets/settings-close-friends.png';
import { useNavigate } from 'react-router-dom';
import BusinessRequestModal from '@/components/BusinessRequestModal';
import BusinessAccountManagement from '@/components/settings/BusinessAccountManagement';
import LanguageModal from '@/components/settings/LanguageModal';
import MutedLocationsModal from '@/components/settings/MutedLocationsModal';
import CloseFriendsModal from '@/components/settings/CloseFriendsModal';
import AdminBusinessRequestsModal from '@/components/settings/AdminBusinessRequestsModal';
import EditProfileModal from '@/components/settings/EditProfileModal';
import { AdminAnalyticsModal } from '@/components/settings/AdminAnalyticsModal';
import { useAdminRole } from '@/hooks/useAdminRole';
import { useBusinessProfile } from '@/hooks/useBusinessProfile';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'zh-CN', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
];

const normalizeLanguage = (lang: string) =>
  lang === 'zh' || lang === 'zh_CN' || lang === 'zh-CN' ? 'zh-CN' : lang;

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAdminRole();
  const { hasValidBusinessAccount } = useBusinessProfile();
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [businessManagementOpen, setBusinessManagementOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [mutedLocationsModalOpen, setMutedLocationsModalOpen] = useState(false);
  const [closeFriendsModalOpen, setCloseFriendsModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [editProfileModalOpen, setEditProfileModalOpen] = useState(false);
  const [adminAnalyticsModalOpen, setAdminAnalyticsModalOpen] = useState(false);
  
  // Check if user is fratrinky (admin analytics access)
  const isFratrinky = user?.id === '101423bc-a06c-40cc-8bb9-42af76946e4d';

  useEffect(() => {
    const load = async () => {
      // Always start from local preference so UI switches instantly
      const stored = normalizeLanguage(localStorage.getItem('i18nextLng') || 'en');
      console.info('🌐 SettingsPage load language:', { stored, i18nLanguage: i18n.language });
      setLanguage(stored);
      if (i18n.language !== stored) {
        try {
          await i18n.changeLanguage(stored);
          console.info('🌐 SettingsPage applied stored language:', {
            after: i18n.language,
            hasCommon: i18n.hasResourceBundle(stored, 'common'),
            hasSettings: i18n.hasResourceBundle(stored, 'settings'),
          });
        } catch (e) {
          console.warn('🌐 SettingsPage failed to apply stored language:', e);
        }
      }

      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .single();

      // If read fails or language is missing, do NOT force English.
      if (error || !data?.language) return;

      const normalizedLang = normalizeLanguage(data.language);
      setLanguage(normalizedLang);
      localStorage.setItem('i18nextLng', normalizedLang);
      if (i18n.language !== normalizedLang) {
        await i18n.changeLanguage(normalizedLang);
      }
    };

    load();
  }, [user?.id]);

  const handleLanguageChange = async (newLanguage: string) => {
    const normalized = normalizeLanguage(newLanguage);

    console.info('🌐 Language change requested:', { newLanguage, normalized, before: i18n.language });

    // Switch UI immediately (don't block on DB)
    setLanguage(normalized);
    localStorage.setItem('i18nextLng', normalized);
    try {
      await i18n.changeLanguage(normalized);
      console.info('🌐 Language changed:', {
        after: i18n.language,
        hasCommon: i18n.hasResourceBundle(normalized, 'common'),
        hasSettings: i18n.hasResourceBundle(normalized, 'settings'),
      });
    } catch (e) {
      console.warn('🌐 i18n.changeLanguage failed:', e);
    }

    const tForLang = i18n.getFixedT(normalized, 'settings');

    if (!user?.id) {
      toast.success(tForLang('languageSaved'));
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ language: normalized })
        .eq('id', user.id);
      if (error) throw error;
      toast.success(tForLang('languageSaved'));
    } catch (e: any) {
      // Keep the local language, just warn that persistence failed
      toast.error(e?.message || tForLang('failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error(t('logoutFailed', { ns: 'settings' }));
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 pt-[calc(env(safe-area-inset-top)+12px)] sticky top-0 z-10 bg-background">
        <button
          onClick={() => navigate('/profile')}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold">{t('title', { ns: 'settings' })}</h1>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-0">
            {/* Edit Profile Setting */}
            <button
              onClick={() => setEditProfileModalOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img src={editProfileIcon} alt="" className="w-12 h-10 object-contain" />
                <div className="text-left">
                  <div className="font-medium">{t('editProfile', { ns: 'settings' })}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('editProfileDesc', { ns: 'settings' })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Language Setting */}
            <button
              onClick={() => setLanguageModalOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img src={languageIcon} alt="" className="w-12 h-12 object-contain" />
                <div className="text-left">
                  <div className="font-medium">{t('language', { ns: 'settings' })}</div>
                  <div className="text-sm text-muted-foreground">
                    {languages.find(l => l.code === language)?.label || 'English'}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Business Account Setting */}
            <button
              onClick={() => {
                if (hasValidBusinessAccount) {
                  setBusinessManagementOpen(true);
                } else {
                  setBusinessModalOpen(true);
                }
              }}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img src={businessIcon} alt="" className="w-12 h-12 object-contain" />
                <div className="text-left">
                  <div className="font-medium">{t('businessAccount', { ns: 'settings' })}</div>
                  <div className="text-sm text-muted-foreground">
                    {hasValidBusinessAccount
                      ? t('manageBusinessAccount', { ns: 'settings' })
                      : t('requestBusinessAccount', { ns: 'settings' })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Muted Locations Setting */}
            <button
              onClick={() => setMutedLocationsModalOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3" style={{ paddingLeft: '7px', paddingRight: '15px' }}>
                <img src={notificationsIcon} alt="" className="w-7 h-7 object-contain" />
                <div className="text-left pl-[13px]">
                  <div className="font-medium">{t('mutedLocations', { ns: 'settings' })}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('manageMutedLocations', { ns: 'settings' })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Close Friends Setting */}
            <button
              onClick={() => setCloseFriendsModalOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <img src={closeFriendsIcon} alt="" className="w-12 h-12 object-contain" />
                <div className="text-left">
                  <div className="font-medium">{t('closeFriends', { ns: 'settings' })}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('manageCloseFriends', { ns: 'settings' })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Admin Panel - Only visible to admins */}
            {isAdmin && (
              <button
                onClick={() => setAdminModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">{t('adminPanel', { ns: 'settings' })}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('manageBusinessRequests', { ns: 'settings' })}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}

            {/* Admin Analytics - Only visible to fratrinky */}
            {isFratrinky && (
              <button
                onClick={() => setAdminAnalyticsModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <div className="font-medium">{t('adminAnalyticsTitle', { ns: 'settings' })}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('adminAnalyticsDesc', { ns: 'settings' })}
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )}
        </div>
      </div>

      {/* Logout Button */}
      <div className="p-4 pb-24">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full rounded-[20px] py-6 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <LogOut className="w-5 h-5 mr-2" />
          {t('logout', { ns: 'common' })}
        </Button>
      </div>

      {/* Modals */}
      <BusinessRequestModal 
        open={businessModalOpen} 
        onOpenChange={setBusinessModalOpen} 
      />
      <BusinessAccountManagement
        open={businessManagementOpen}
        onOpenChange={setBusinessManagementOpen}
      />
      <LanguageModal
        open={languageModalOpen}
        onOpenChange={setLanguageModalOpen}
        currentLanguage={language}
        onLanguageChange={handleLanguageChange}
        saving={saving}
      />
      <MutedLocationsModal
        open={mutedLocationsModalOpen}
        onOpenChange={setMutedLocationsModalOpen}
      />
      <CloseFriendsModal
        open={closeFriendsModalOpen}
        onOpenChange={setCloseFriendsModalOpen}
      />
      <AdminBusinessRequestsModal
        open={adminModalOpen}
        onOpenChange={setAdminModalOpen}
      />
      <EditProfileModal
        open={editProfileModalOpen}
        onOpenChange={setEditProfileModalOpen}
      />
      <AdminAnalyticsModal
        open={adminAnalyticsModalOpen}
        onOpenChange={setAdminAnalyticsModalOpen}
      />
    </div>
  );
};

export default SettingsPage;
