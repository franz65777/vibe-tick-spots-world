import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

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
      if (data?.language) setLanguage(data.language);
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
      toast.success('Language preference saved');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="p-4 max-w-2xl mx-auto w-full">
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="text-sm font-medium mb-2">Language</div>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map(l => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default SettingsPage;
