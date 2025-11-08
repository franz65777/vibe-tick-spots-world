import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const SignupDetails: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [gender, setGender] = useState('');

  useEffect(() => { document.title = 'Dettagli - Spott'; }, []);
  
  useEffect(() => {
    const session = sessionStorage.getItem('signup_session');
    if (!session) {
      navigate('/signup/start');
      return;
    }
    // Restore form data if returning from next step
    const savedDob = sessionStorage.getItem('signup_dob');
    const savedGender = sessionStorage.getItem('signup_gender');
    if (savedDob) setDob(new Date(savedDob));
    if (savedGender) setGender(savedGender);
  }, [navigate]);

  const canContinue = useMemo(() => !!dob && !!gender, [dob, gender]);

  const onNext = () => {
    if (!canContinue || !dob) return;
    sessionStorage.setItem('signup_dob', format(dob, 'yyyy-MM-dd'));
    sessionStorage.setItem('signup_gender', gender);
    navigate('/signup/password');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2" /> {t('auth:back') || 'Indietro'}
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal rounded-xl h-12",
                    !dob && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dob ? format(dob, "d MMMM yyyy", { locale: it }) : <span>Seleziona data</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                <Calendar
                  mode="single"
                  selected={dob}
                  onSelect={setDob}
                  disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                  initialFocus
                  className="pointer-events-auto rounded-xl"
                  captionLayout="dropdown"
                  fromYear={1900}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="gender">Sesso</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleziona" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="female">Donna</SelectItem>
                <SelectItem value="male">Uomo</SelectItem>
                <SelectItem value="nonbinary">Non binario</SelectItem>
                <SelectItem value="prefer_not">Preferisco non dirlo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button disabled={!canContinue} onClick={onNext} className="w-full h-12 rounded-xl">
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

export default SignupDetails;
