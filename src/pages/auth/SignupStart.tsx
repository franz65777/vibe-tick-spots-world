import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { MapPin, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'it', label: 'Italiano' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'pt', label: 'Português' },
  { code: 'nl', label: 'Nederlands' },
  { code: 'pl', label: 'Polski' },
  { code: 'ru', label: 'Русский' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'ja', label: '日本語' },
  { code: 'zh', label: '中文' },
];

const SignupStart: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [method, setMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Unisciti a Spott - Signup';
  }, []);

  const canContinue = useMemo(() => {
    const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email.trim());
    const phoneValid = /^\+?[0-9\s\-()]{7,15}$/.test(phone.trim());
    return method === 'email' ? emailValid : phoneValid;
  }, [method, email, phone]);

  const sendCode = async () => {
    setLoading(true);
    try {
      if (method === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast.success('Codice inviato alla tua email');
        navigate(`/signup/verify?method=email&email=${encodeURIComponent(email.trim())}`);
      } else {
        const { error } = await supabase.auth.signInWithOtp({
          phone: phone.trim(),
          options: { shouldCreateUser: true },
        });
        if (error) throw error;
        toast.success('Codice inviato al tuo numero di telefono');
        navigate(`/signup/verify?method=phone&phone=${encodeURIComponent(phone.trim())}`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Impossibile inviare il codice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="text-muted-foreground">
          <ArrowLeft className="mr-2" /> {t('auth:back') || 'Indietro'}
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-40">
            <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
              <SelectTrigger className="h-9 rounded-md bg-background border border-input text-sm" aria-label="Language selector">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent className="rounded-md bg-popover text-popover-foreground z-[99999]">
                {languages.map((l) => (
                  <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-semibold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent flex items-center justify-center gap-1">
              SPOTT <MapPin className="w-4 h-4" />
            </h1>
            <h2 className="mt-3 text-2xl font-semibold">Unisciti a Spott</h2>
            <p className="mt-1 text-muted-foreground">Inizia con la tua email o numero di telefono</p>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`snap-start px-4 py-2 text-sm rounded-full border border-input ${method === 'email' ? 'bg-accent text-accent-foreground' : 'bg-background text-foreground'}`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setMethod('phone')}
              className={`snap-start px-4 py-2 text-sm rounded-full border border-input ${method === 'phone' ? 'bg-accent text-accent-foreground' : 'bg-background text-foreground'}`}
            >
              Telefono
            </button>
          </div>

          {method === 'email' ? (
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@esempio.com" autoComplete="email" />
            </div>
          ) : (
            <div>
              <Label htmlFor="phone">Numero di telefono</Label>
              <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+39 333 123 4567" autoComplete="tel" />
              <p className="mt-1 text-xs text-muted-foreground">Potrebbe richiedere la configurazione SMS su Supabase</p>
            </div>
          )}

          <Button disabled={!canContinue || loading} onClick={sendCode} className="w-full h-12">
            {loading ? 'Invio in corso...' : 'Invia codice'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Hai già un account?
            <Link to="/auth?mode=login" className="ml-1 text-primary underline">Accedi</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignupStart;
