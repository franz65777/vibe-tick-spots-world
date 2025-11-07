import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Globe, Building2, BellOff, ArrowLeft, Shield, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BusinessRequestModal from '@/components/BusinessRequestModal';
import LanguageModal from '@/components/settings/LanguageModal';
import MutedLocationsModal from '@/components/settings/MutedLocationsModal';
import { useAdminRole } from '@/hooks/useAdminRole';

const languages = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'zh-CN', label: '简体中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAdminRole();
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);
  const [languageModalOpen, setLanguageModalOpen] = useState(false);
  const [mutedLocationsModalOpen, setMutedLocationsModalOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .single();
      const lang = data?.language || 'en';
      setLanguage(lang);
      localStorage.setItem('i18nextLng', lang);
      i18n.changeLanguage(lang);
    };
    load();
  }, [user?.id]);

  const handleLanguageChange = async (newLanguage: string) => {
    setLanguage(newLanguage);
    
    if (!user?.id) {
      localStorage.setItem('i18nextLng', newLanguage);
      i18n.changeLanguage(newLanguage);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ language: newLanguage })
        .eq('id', user.id);
      if (error) throw error;
      localStorage.setItem('i18nextLng', newLanguage);
      i18n.changeLanguage(newLanguage);
      toast.success(t('languageSaved', { ns: 'settings' }));
    } catch (e: any) {
      toast.error(e?.message || t('failedToSave', { ns: 'settings' }));
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
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with back button */}
      <div className="flex items-center gap-3 p-4 border-b bg-background sticky top-0 z-10">
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
        <Card className="border-0 shadow-none rounded-none">
          <CardContent className="p-0">
            {/* Edit Profile Setting */}
            <button
              onClick={() => navigate('/edit-profile')}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-muted-foreground" />
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
                <Globe className="w-5 h-5 text-muted-foreground" />
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
              onClick={() => setBusinessModalOpen(true)}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">{t('businessAccount', { ns: 'settings' })}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('requestBusinessAccount', { ns: 'settings' })}
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
              <div className="flex items-center gap-3">
                <BellOff className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <div className="font-medium">{t('mutedLocations', { ns: 'settings' })}</div>
                  <div className="text-sm text-muted-foreground">
                    {t('manageMutedLocations', { ns: 'settings' })}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            {/* Admin Panel - Only visible to admins */}
            {isAdmin && (
              <button
                onClick={() => navigate('/admin/business-requests')}
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
          </CardContent>
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-4 pb-4 bg-background" style={{ marginTop: '-40px' }}>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full rounded-[20px] py-6 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20"
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
    </div>
  );
};

export default SettingsPage;
