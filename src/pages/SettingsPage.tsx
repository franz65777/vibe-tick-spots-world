import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { useTranslation } from 'react-i18next';

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
      i18n.changeLanguage(lang);
    };
    load();
  }, [user?.id]);

  const onSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ language })
        .eq('id', user.id);
      if (error) throw error;
      i18n.changeLanguage(language);
      toast.success(t('settings.languageSaved'));
    } catch (e: any) {
      toast.error(e?.message || t('settings.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-4 max-w-2xl mx-auto w-full">
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-semibold text-foreground mb-3 block">{t('settings.language')}</label>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:border-primary/50 ${
                    language === lang.code
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border bg-background'
                  }`}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${language === lang.code ? 'text-primary' : 'text-foreground'}`}>
                      {lang.label}
                    </div>
                  </div>
                  {language === lang.code && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={onSave} disabled={saving} className="w-full h-12 text-base font-semibold">
            {saving ? t('settings.saving') : t('settings.saveChanges')}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default SettingsPage;
