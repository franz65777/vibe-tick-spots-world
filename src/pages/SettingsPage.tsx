import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Globe, Building2 } from 'lucide-react';
import BusinessRequestModal from '@/components/BusinessRequestModal';

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
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [businessModalOpen, setBusinessModalOpen] = useState(false);

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

  return (
    <>
      <main className="p-4 max-w-2xl mx-auto w-full pb-24">
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="text-2xl">{t('title', { ns: 'settings' })}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {/* Language Setting */}
            <button
              onClick={() => {/* Could open language modal */}}
              className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors border-b"
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

            {/* Expandable Language Grid */}
            <div className="p-6 bg-muted/30">
              <div className="grid grid-cols-2 gap-2.5">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    disabled={saving}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all min-h-[60px] ${
                      language === lang.code
                        ? 'border-primary bg-primary/10 shadow-sm'
                        : 'border-border bg-background hover:border-primary/30'
                    } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="text-2xl flex-shrink-0">{lang.flag}</span>
                    <div className="flex-1 text-left min-w-0">
                      <div className={`font-medium text-sm truncate ${language === lang.code ? 'text-primary' : 'text-foreground'}`}>
                        {lang.label}
                      </div>
                    </div>
                    {language === lang.code && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BusinessRequestModal 
        open={businessModalOpen} 
        onOpenChange={setBusinessModalOpen} 
      />
    </>
  );
};

export default SettingsPage;
