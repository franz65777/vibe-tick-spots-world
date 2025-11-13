import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';

const SignupVerify: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const method = (params.get('method') as 'email' | 'phone') || 'email';
  const email = params.get('email') || '';
  const phone = params.get('phone') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    document.title = 'Verifica codice - Spott';
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          method,
          email: method === 'email' ? email : undefined,
          phone: method === 'phone' ? phone : undefined,
          code,
        }
      });

      if (error) throw error;
      if (!data?.success || !data?.sessionToken) throw new Error('Verifica fallita');

      // Store session token and contact info in sessionStorage
      sessionStorage.setItem('signup_session', data.sessionToken);
      sessionStorage.setItem('signup_contact', method === 'email' ? email : phone);
      sessionStorage.setItem('signup_method', method);

      toast.success('Codice verificato');
      navigate('/signup/profile');
    } catch (e: any) {
      toast.error(e?.message || 'Codice non valido');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: {
          method,
          email: method === 'email' ? email : undefined,
          phone: method === 'phone' ? phone : undefined,
        }
      });

      if (error) throw error;
      toast.success('Nuovo codice inviato');
      setResendCooldown(60);
    } catch (e: any) {
      toast.error(e?.message || 'Errore nell\'invio');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2" /> {t('auth:back') || 'Indietro'}
        </Button>
        <ThemeToggle />
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Inserisci il codice</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Abbiamo inviato un codice a {method === 'email' ? email : phone}
            </p>
          </div>

          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button disabled={code.length < 6 || loading} onClick={verify} className="w-full h-12">
            {loading ? 'Verifico...' : 'Verifica'}
          </Button>

          <Button 
            variant="ghost" 
            disabled={resendCooldown > 0 || loading} 
            onClick={resendCode} 
            className="w-full"
          >
            <RefreshCw className="mr-2 w-4 h-4" />
            {resendCooldown > 0 ? `Reinvia tra ${resendCooldown}s` : 'Reinvia codice'}
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

export default SignupVerify;
