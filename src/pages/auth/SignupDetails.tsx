import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const SignupDetails: React.FC = () => {
  const navigate = useNavigate();
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'Dettagli - Spott'; }, []);

  const canContinue = useMemo(() => !!dob && !!gender, [dob, gender]);

  const onNext = async () => {
    setLoading(true);
    try {
      // Salviamo nei user metadata per compatibilità universale
      const { error } = await supabase.auth.updateUser({
        data: { date_of_birth: dob, gender },
      });
      if (error) throw error;
      navigate('/signup/password');
    } catch (e: any) {
      toast.error(e?.message || 'Errore nel salvataggio');
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
            <h1 className="text-2xl font-semibold">Altri dettagli</h1>
            <p className="text-sm text-muted-foreground mt-1">Data di nascita e sesso</p>
          </div>

          <div>
            <Label htmlFor="dob">Data di nascita</Label>
            <Input id="dob" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="gender">Sesso</Label>
            <select
              id="gender"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="mt-1 h-10 w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">Seleziona</option>
              <option value="female">Donna</option>
              <option value="male">Uomo</option>
              <option value="nonbinary">Non binario</option>
              <option value="prefer_not">Preferisco non dirlo</option>
            </select>
          </div>

          <Button disabled={!canContinue || loading} onClick={onNext} className="w-full h-12">
            {loading ? 'Salvataggio...' : 'Continua'}
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

export default SignupDetails;
