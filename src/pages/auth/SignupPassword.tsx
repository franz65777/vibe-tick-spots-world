import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SignupPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'Crea password - Spott'; }, []);

  const canCreate = useMemo(() => password.length >= 6 && password === confirm, [password, confirm]);

  const createAccount = async () => {
    if (!canCreate) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Account creato con successo');
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
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2" /> Indietro
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
              <Input id="confirm" type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Ripeti la password" className="pr-10" />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute inset-y-0 right-2 flex items-center">
                {showConfirm ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <Button disabled={!canCreate || loading} onClick={createAccount} className="w-full h-12">
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
