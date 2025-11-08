import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SignupVerify: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const method = (params.get('method') as 'email' | 'phone') || 'email';
  const email = params.get('email') || '';
  const phone = params.get('phone') || '';
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Verifica codice - Spott';
  }, []);

  const verify = async () => {
    if (code.length < 6) return;
    setLoading(true);
    try {
      if (method === 'email') {
        const { error } = await supabase.auth.verifyOtp({ email: email!, token: code, type: 'email' });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.verifyOtp({ phone: phone!, token: code, type: 'sms' });
        if (error) throw error;
      }
      toast.success('Verifica completata');
      navigate('/signup/profile');
    } catch (e: any) {
      toast.error(e?.message || 'Codice non valido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2" /> Indietro
        </Button>
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
