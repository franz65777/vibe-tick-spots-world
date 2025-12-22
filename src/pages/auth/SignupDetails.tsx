import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';

const SignupDetails: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [dob, setDob] = useState<Date | undefined>(undefined);
  const [gender, setGender] = useState('');

  useEffect(() => { document.title = 'Details - Spott'; }, []);
  
  useEffect(() => {
    const session = sessionStorage.getItem('signup_session');
    if (!session) {
      navigate('/signup/start');
      return;
    }
    // Only restore data when navigating back
    const isNavigatingBack = sessionStorage.getItem('signup_nav_back');
    if (isNavigatingBack === 'true') {
      const savedDob = sessionStorage.getItem('signup_dob');
      const savedGender = sessionStorage.getItem('signup_gender');
      if (savedDob) setDob(new Date(savedDob));
      if (savedGender) setGender(savedGender);
      sessionStorage.removeItem('signup_nav_back');
    }
  }, [navigate]);

  const canContinue = useMemo(() => !!dob && !!gender, [dob, gender]);

  const onNext = () => {
    if (!canContinue || !dob) return;
    const year = dob.getFullYear();
    const month = String(dob.getMonth() + 1).padStart(2, '0');
    const day = String(dob.getDate()).padStart(2, '0');
    sessionStorage.setItem('signup_dob', `${year}-${month}-${day}`);
    sessionStorage.setItem('signup_gender', gender);
    navigate('/signup/password');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pt-safe pb-safe">
      <header className="p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => {
          sessionStorage.setItem('signup_nav_back', 'true');
          navigate(-1);
        }}>
          <ArrowLeft className="mr-2" /> {t('auth:back')}
        </Button>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">{t('signup:otherDetails')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('signup:dobAndGender')}</p>
          </div>

          <div>
            <Label htmlFor="dob">{t('signup:dateOfBirth')}</Label>
            <DatePicker value={dob} onChange={setDob} minYear={1900} maxYear={new Date().getFullYear()} />
          </div>

          <div>
            <Label htmlFor="gender">{t('signup:gender')}</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('signup:selectGender')} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="female">{t('signup:female')}</SelectItem>
                <SelectItem value="male">{t('signup:male')}</SelectItem>
                <SelectItem value="nonbinary">{t('signup:nonbinary')}</SelectItem>
                <SelectItem value="prefer_not">{t('signup:preferNotToSay')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button disabled={!canContinue} onClick={onNext} className="w-full h-12 rounded-xl">
            {t('signup:continue')}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {t('signup:alreadyHaveAccount')}
            <Link to="/auth?mode=login" className="ml-1 text-primary underline">{t('signup:login')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignupDetails;
