import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SignupPassword: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'Crea password - Spott'; }, []);
  
  useEffect(() => {
    const session = sessionStorage.getItem('signup_session');
    if (!session) {
      navigate('/signup/start');
      return;
    }
    // Only restore password when navigating back
    const isNavigatingBack = sessionStorage.getItem('signup_nav_back');
    if (isNavigatingBack === 'true') {
      const savedPassword = sessionStorage.getItem('signup_password');
      if (savedPassword) setPassword(savedPassword);
      sessionStorage.removeItem('signup_nav_back');
    }
  }, [navigate]);

  const canCreate = useMemo(() => password.length >= 6 && password === confirm, [password, confirm]);

  const createAccount = async () => {
    if (!canCreate) return;
    setLoading(true);
    
    try {
      const sessionToken = sessionStorage.getItem('signup_session');
      const fullName = sessionStorage.getItem('signup_fullname');
      const username = sessionStorage.getItem('signup_username');
      const dob = sessionStorage.getItem('signup_dob');
      const gender = sessionStorage.getItem('signup_gender');
      const method = sessionStorage.getItem('signup_method');
      const contact = sessionStorage.getItem('signup_contact');

      if (!sessionToken || !fullName || !username || !dob || !gender || !method || !contact) {
        throw new Error('Dati incompleti');
      }

      // Store password temporarily for back navigation
      sessionStorage.setItem('signup_password', password);

      const payload: any = {
        sessionToken,
        fullName,
        username,
        dateOfBirth: dob,
        gender,
        password,
      };

      if (method === 'email') {
        payload.email = contact;
      } else {
        payload.phone = contact;
      }

      const { data, error } = await supabase.functions.invoke('complete-signup', {
        body: payload
      });

      if (error) {
        let msg = error.message || 'Errore nella creazione account';
        try {
          // Prova a estrarre l'errore dal body JSON se disponibile
          // @ts-ignore
          if (error.context?.json) {
            // @ts-ignore
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          } else {
            // Talvolta il messaggio contiene un JSON serializzato
            const parsed = JSON.parse(msg);
            if (parsed?.error) msg = parsed.error;
          }
        } catch {}

        toast.error(msg);
        if (/telefono|phone/i.test(msg)) {
          sessionStorage.setItem('signup_nav_back', 'true');
          navigate('/signup/start');
          return;
        }
        if (/username/i.test(msg)) {
          sessionStorage.setItem('signup_nav_back', 'true');
          navigate('/signup/profile');
        }
        return; // Ferma il flusso per evitare schermate bianche
      }

      if (!data?.success) {
        toast.error(data?.error || 'Creazione account fallita');
        return;
      }

      // Auto-login with the returned session
      if (data.session) {
        await supabase.auth.setSession(data.session);
      }

      // Clear session storage
      sessionStorage.removeItem('signup_session');
      sessionStorage.removeItem('signup_fullname');
      sessionStorage.removeItem('signup_username');
      sessionStorage.removeItem('signup_dob');
      sessionStorage.removeItem('signup_gender');
      sessionStorage.removeItem('signup_method');
      sessionStorage.removeItem('signup_contact');
      sessionStorage.removeItem('signup_password');

      toast.success('Account creato con successo!');
      navigate('/');
    } catch (e: any) {
      toast.error(e?.message || 'Errore nella creazione account');
    } finally {
      setLoading(false);
    }
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
            <h1 className="text-2xl font-semibold">Crea password</h1>
            <p className="text-sm text-muted-foreground mt-1">Imposta una password per accedere più velocemente</p>
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1">
              <Input id="password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Almeno 6 caratteri" className="pr-10" />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 right-2 flex items-center">
                {showPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirm">Conferma password</Label>
            <div className="relative mt-1">
              <Input id="confirm" type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ripeti la password" className="pr-10 bg-background text-foreground" />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute inset-y-0 right-2 flex items-center">
                {showConfirm ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <Button disabled={!canCreate || loading} onClick={createAccount} className="w-full h-12 rounded-xl">
            {loading ? 'Creazione...' : 'Crea account'}
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

export default SignupPassword;
