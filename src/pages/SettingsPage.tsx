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
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
];

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [language, setLanguage] = useState('en');
  const [saving, setSaving] = useState(false);
  const [useCustom, setUseCustom] = useState(false);
  const [customLanguage, setCustomLanguage] = useState('');

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
      if (!languages.find(l => l.code === lang)) {
        setUseCustom(true);
        setCustomLanguage(lang);
      } else {
        setUseCustom(false);
      }
    };
    load();
  }, [user?.id]);

  const onSave = async () => {
    if (!user?.id) return;
    const langToSave = useCustom ? (customLanguage || 'en') : language;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ language: langToSave })
        .eq('id', user.id);
      if (error) throw error;
      i18n.changeLanguage(langToSave);
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
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">{t('settings.language')}</div>
            <Select value={useCustom ? '__custom__' : language} onValueChange={(val) => {
                if (val === '__custom__') { setUseCustom(true); }
                else { setUseCustom(false); setLanguage(val); }
              }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('settings.chooseLanguage')} />
              </SelectTrigger>
              <SelectContent>
                {languages.map(l => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
                <SelectItem value="__custom__">{t('settings.customOther')}</SelectItem>
              </SelectContent>
            </Select>
            {useCustom && (
              <div className="mt-2 space-y-1">
                <Input
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  placeholder={t('settings.languageCodePlaceholder')}
                />
                <p className="text-xs text-muted-foreground">{t('settings.bcp47Help')}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving}>
              {saving ? t('settings.saving') : t('settings.saveChanges')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default SettingsPage;
