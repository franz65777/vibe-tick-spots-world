import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SignupProfile: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => { document.title = 'Profilo - Spott'; }, []);
  
  useEffect(() => {
    const session = sessionStorage.getItem('signup_session');
    if (!session) {
      navigate('/signup/start');
      return;
    }
    // Only restore data when navigating back
    const isNavigatingBack = sessionStorage.getItem('signup_nav_back');
    if (isNavigatingBack === 'true') {
      const savedFullName = sessionStorage.getItem('signup_fullname');
      const savedUsername = sessionStorage.getItem('signup_username');
      if (savedFullName) setFullName(savedFullName);
      if (savedUsername) setUsername(savedUsername);
      sessionStorage.removeItem('signup_nav_back');
    }
  }, [navigate]);

  // Debounce username check (server-side)
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) { setAvailable(null); return; }
    setAvailable(null);
    setChecking(true);
    const id = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-availability', {
          body: { type: 'username', value: trimmed }
        });
        if (error) throw error;
        setAvailable(!data?.exists); // se esiste -> not available
      } catch (e) {
        console.error('Username check error:', e);
        setAvailable(null);
      } finally {
        setChecking(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [username]);

  const canContinue = useMemo(() => fullName.trim().length > 1 && available === true, [fullName, available]);

  const onNext = async () => {
    if (!canContinue) return;
    
    // Double-check username availability before proceeding (server-side)
    try {
      const trimmed = username.trim().toLowerCase();
      const { data, error } = await supabase.functions.invoke('check-availability', {
        body: { type: 'username', value: trimmed }
      });
      if (error) throw error;
      if (data?.exists) {
        toast.error('Nome utente non disponibile');
        setAvailable(false);
        return;
      }
    } catch (e: any) {
      toast.error(e?.message || 'Errore verifica username');
      return;
    }
    
    sessionStorage.setItem('signup_fullname', fullName.trim());
    sessionStorage.setItem('signup_username', username.trim().toLowerCase());
    navigate('/signup/details');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => {
          sessionStorage.setItem('signup_nav_back', 'true');
          navigate(-1);
        }}>
          <ArrowLeft className="mr-2" /> {t('auth:back') || 'Indietro'}
        </Button>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Il tuo profilo</h1>
            <p className="text-sm text-muted-foreground mt-1">Inserisci nome completo e scegli un username</p>
          </div>

          <div>
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Mario Rossi" />
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                placeholder="mariorossi"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                className="pr-10"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                {checking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                {!checking && available === true && <Check className="w-4 h-4 text-green-600" />}
                {!checking && available === false && <X className="w-4 h-4 text-destructive" />}
              </div>
            </div>
            {available === false && (
              <p className="mt-1 text-xs text-destructive">Nome utente già in uso</p>
            )}
          </div>

          <Button disabled={!canContinue || checking} onClick={onNext} className="w-full h-12 rounded-xl">
            Continua
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

export default SignupProfile;
