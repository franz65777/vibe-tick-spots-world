import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Check, Loader2, X, MapPin } from 'lucide-react';
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

  const [checking, setChecking] = useState(false);
  const [exists, setExists] = useState<null | boolean>(null);
  const [existsMessage, setExistsMessage] = useState<string>('');

  useEffect(() => {
    document.title = 'Unisciti a Spott - Signup';
  }, []);

  // Reset exists state when switching methods
  useEffect(() => {
    setExists(null);
    setExistsMessage('');
    setChecking(false);
  }, [method]);

  // Debounced availability check for email
  useEffect(() => {
    const v = email.trim();
    if (!v) { setExists(null); setExistsMessage(''); return; }
    if (!/[^\s@]+@[^\s@]+\.[^\s@]+/.test(v)) { setExists(null); return; }
    
    setChecking(true);
    setExists(null);
    const id = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-availability', {
          body: { type: 'email', value: v }
        });
        if (error) throw error;
        const emailExists = !!data?.exists;
        setExists(emailExists);
        setExistsMessage(emailExists ? 'Email già registrata' : '');
      } catch (e: any) {
        console.error('Email check error:', e);
        setExists(null);
        setExistsMessage('');
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [email]);

  // Debounced availability check for phone
  useEffect(() => {
    const v = phone.trim();
    if (!v) { setExists(null); setExistsMessage(''); return; }
    if (!/^\+?[0-9\s\-()]{7,15}$/.test(v)) { setExists(null); return; }
    
    setChecking(true);
    setExists(null);
    const id = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-availability', {
          body: { type: 'phone', value: v }
        });
        if (error) throw error;
        const phoneExists = !!data?.exists;
        setExists(phoneExists);
        setExistsMessage(phoneExists ? 'Numero già registrato' : '');
      } catch (e: any) {
        console.error('Phone check error:', e);
        setExists(null);
        setExistsMessage('');
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [phone]);

  const canContinue = useMemo(() => {
    const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email.trim());
    const phoneValid = /^\+?[0-9\s\-()]{7,15}$/.test(phone.trim());
    const valid = method === 'email' ? emailValid : phoneValid;
    return valid && !checking && exists === false; // disabilita se esiste o sta controllando
  }, [method, email, phone, checking, exists]);

  const sendCode = async () => {
    if (exists) {
      toast.error(existsMessage || (method === 'email' ? 'Email già registrata' : 'Numero già registrato'));
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          method,
          email: method === 'email' ? email.trim() : undefined,
          phone: method === 'phone' ? phone.trim() : undefined,
        }
      });

      if (error) throw error;

      toast.success(method === 'email' ? 'Codice inviato alla tua email' : 'Codice inviato al tuo telefono');
      navigate(`/signup/verify?method=${method}&${method}=${encodeURIComponent(method === 'email' ? email.trim() : phone.trim())}`);
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
        <div className="w-40">
          <Select value={i18n.language} onValueChange={(v) => i18n.changeLanguage(v)}>
            <SelectTrigger className="h-9 rounded-full bg-background border border-input text-sm" aria-label="Language selector">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent className="rounded-xl bg-popover text-popover-foreground z-[99999]">
              {languages.map((l) => (
                <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      </header>

      <main className="flex-1 px-6 py-8 overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <h1 className="text-4xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent flex items-baseline">
                  SPOTT
                  <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
                </h1>
              </div>
            </div>
            <h2 className="mt-3 text-2xl font-semibold">Unisciti a Spott</h2>
            <p className="mt-1 text-muted-foreground">Inizia con la tua email o numero di telefono</p>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-center snap-x snap-mandatory">
            <button
              type="button"
              onClick={() => setMethod('email')}
              className={`snap-center px-6 py-2 text-sm rounded-full border border-input transition-all ${method === 'email' ? 'bg-accent text-accent-foreground scale-105' : 'bg-background text-foreground'}`}
            >
              Email
            </button>
            <button
              type="button"
              onClick={() => setMethod('phone')}
              className={`snap-center px-6 py-2 text-sm rounded-full border border-input transition-all ${method === 'phone' ? 'bg-accent text-accent-foreground scale-105' : 'bg-background text-foreground'}`}
            >
              Telefono
            </button>
          </div>

          {method === 'email' ? (
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="nome@esempio.com" 
                  autoComplete="email"
                  className="pr-10"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  {checking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {!checking && exists === false && <Check className="w-4 h-4 text-green-600" />}
                  {!checking && exists === true && <X className="w-4 h-4 text-destructive" />}
                </div>
              </div>
              {exists === true && (
                <div className="mt-2 text-sm text-destructive">
                  Questa email è già in uso. <button type="button" className="underline text-primary ml-1" onClick={() => navigate('/auth?mode=login')}>Accedi</button>
                </div>
              )}
            </div>
          ) : (
            <div>
              <Label htmlFor="phone">Numero di telefono</Label>
              <div className="relative">
                <Input 
                  id="phone" 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+39 333 123 4567" 
                  autoComplete="tel"
                  className="pr-10 bg-background text-foreground"
                />
                <div className="absolute inset-y-0 right-2 flex items-center">
                  {checking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                  {!checking && exists === false && <Check className="w-4 h-4 text-green-600" />}
                  {!checking && exists === true && <X className="w-4 h-4 text-destructive" />}
                </div>
              </div>
              {exists === true && (
                <div className="mt-2 text-sm text-destructive">
                  Questo numero è già in uso. <button type="button" className="underline text-primary ml-1" onClick={() => navigate('/auth?mode=login')}>Accedi</button>
                </div>
              )}
            </div>
          )}

          <Button disabled={!canContinue || loading} onClick={sendCode} className="w-full h-12">
            {loading ? 'Invio in corso...' : exists ? (method === 'email' ? 'Email già in uso' : 'Numero già in uso') : 'Invia codice'}
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
