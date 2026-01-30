import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { DatePicker } from '@/components/DatePicker';
import { haptics } from '@/utils/haptics';

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
    haptics.impact('light');
    const year = dob.getFullYear();
    const month = String(dob.getMonth() + 1).padStart(2, '0');
    const day = String(dob.getDate()).padStart(2, '0');
    sessionStorage.setItem('signup_dob', `${year}-${month}-${day}`);
    sessionStorage.setItem('signup_gender', gender);
    navigate('/signup/password');
  };

  const handleGenderChange = (value: string) => {
    haptics.selection();
    setGender(value);
  };

  return (
    <div className="min-h-screen bg-[#F5F1EA] dark:bg-background text-foreground flex flex-col pt-safe pb-safe">
      <header className="p-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            haptics.selection();
            sessionStorage.setItem('signup_nav_back', 'true');
            navigate(-1);
          }}
          className="active:scale-95 transition-transform"
        >
          <ArrowLeft className="mr-2" /> {t('auth:back')}
        </Button>
      </header>

      <main className="flex-1 px-6 py-10">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="animate-in fade-in duration-500">
            <h1 className="text-2xl font-semibold">{t('signup:otherDetails')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('signup:dobAndGender')}</p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <Label htmlFor="dob">{t('signup:dateOfBirth')}</Label>
            <DatePicker value={dob} onChange={setDob} minYear={1900} maxYear={new Date().getFullYear()} />
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <Label htmlFor="gender">{t('signup:gender')}</Label>
            <Select value={gender} onValueChange={handleGenderChange}>
              <SelectTrigger className="w-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
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

          <Button 
            disabled={!canContinue} 
            onClick={onNext} 
            className="w-full h-12 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] active:scale-[0.98] transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300"
          >
            {t('signup:continue')}
          </Button>

          <div className="text-center text-sm text-muted-foreground animate-in fade-in duration-500 delay-400">
            {t('signup:alreadyHaveAccount')}
            <Link to="/auth?mode=login" className="ml-1 text-primary underline active:scale-95 transition-transform inline-block">{t('signup:login')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignupDetails;
