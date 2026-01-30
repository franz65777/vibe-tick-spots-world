import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ArrowLeft, Check, Loader2, X } from 'lucide-react';
import languageIcon from '@/assets/icon-language.png';
import spottLogo from '@/assets/spott-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { haptics } from '@/utils/haptics';

const languages = [
  { code: 'en', label: 'English', phonePlaceholder: '+44 7700 900123' },
  { code: 'es', label: 'Español', phonePlaceholder: '+34 612 34 56 78' },
  { code: 'fr', label: 'Français', phonePlaceholder: '+33 6 12 34 56 78' },
  { code: 'de', label: 'Deutsch', phonePlaceholder: '+49 151 23456789' },
  { code: 'it', label: 'Italiano', phonePlaceholder: '+39 333 123 4567' },
  { code: 'pt', label: 'Português', phonePlaceholder: '+351 912 345 678' },
  { code: 'zh-CN', label: '中文', phonePlaceholder: '+86 138 0013 8000' },
  { code: 'ja', label: '日本語', phonePlaceholder: '+81 90 1234 5678' },
  { code: 'ko', label: '한국어', phonePlaceholder: '+82 10 1234 5678' },
  { code: 'ar', label: 'العربية', phonePlaceholder: '+966 50 123 4567' },
  { code: 'hi', label: 'हिन्दी', phonePlaceholder: '+91 98765 43210' },
  { code: 'ru', label: 'Русский', phonePlaceholder: '+7 912 345 67 89' },
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
    document.title = `${t('auth:signUp')} - Spott`;
  }, [t]);

  // Capture referral code from URL on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode) {
      sessionStorage.setItem('signup_referral_code', refCode);
      console.log('📧 Referral code captured:', refCode);
    }
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
        setExistsMessage(emailExists ? t('auth:emailAlreadyInUse') : '');
      } catch (e: any) {
        console.error('Email check error:', e);
        setExists(null);
        setExistsMessage('');
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [email, t]);

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
        setExistsMessage(phoneExists ? t('auth:phoneAlreadyInUse') : '');
      } catch (e: any) {
        console.error('Phone check error:', e);
        setExists(null);
        setExistsMessage('');
      } finally {
        setChecking(false);
      }
    }, 500);
    return () => clearTimeout(id);
  }, [phone, t]);

  const canContinue = useMemo(() => {
    const emailValid = /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email.trim());
    const phoneValid = /^\+?[0-9\s\-()]{7,15}$/.test(phone.trim());
    const valid = method === 'email' ? emailValid : phoneValid;
    return valid && !checking && exists === false;
  }, [method, email, phone, checking, exists]);

  const handleMethodChange = (newMethod: 'email' | 'phone') => {
    haptics.selection();
    setMethod(newMethod);
  };

  const sendCode = async () => {
    if (exists) {
      toast.error(existsMessage || (method === 'email' ? t('auth:emailAlreadyInUse') : t('auth:phoneAlreadyInUse')));
      return;
    }
    haptics.impact('light');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: {
          method,
          email: method === 'email' ? email.trim() : undefined,
          phone: method === 'phone' ? phone.trim() : undefined,
          redirectUrl: 'https://spott.cloud',
          language: i18n.language,
        }
      });

      if (error) throw error;

      // Check if we're in dev mode (email not sent but OTP generated)
      if (data?.devMode && data?.devCode) {
        toast.success('🔧 DEV MODE - Codice OTP: ' + data.devCode, { 
          duration: 20000,
          description: 'Il dominio email non è verificato. Usa questo codice per testare.'
        });
      } else {
        toast.success(method === 'email' ? t('auth:codeSentEmail') : t('auth:codeSentPhone'));
      }

      // Store language in session storage for signup flow
      sessionStorage.setItem('signup_language', i18n.language);
      navigate(`/signup/verify?method=${method}&${method}=${encodeURIComponent(method === 'email' ? email.trim() : phone.trim())}`);
    } catch (e: any) {
      haptics.error();
      toast.error(e?.message || t('auth:cannotSendCode'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1EA] dark:bg-background text-foreground flex flex-col pt-safe pb-safe">
      <header className="p-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => {
            haptics.selection();
            navigate('/');
          }} 
          className="text-muted-foreground active:scale-95 transition-transform"
        >
          <ArrowLeft className="mr-2" /> {t('auth:back')}
        </Button>
        <div className="w-40">
          <Select value={i18n.language} onValueChange={(v) => { i18n.changeLanguage(v); localStorage.setItem('i18nextLng', v); }}>
            <SelectTrigger className="h-9 rounded-full bg-background border border-input text-sm flex items-center gap-2 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]" aria-label="Language selector">
              <img src={languageIcon} alt="" className="w-5 h-5 flex-shrink-0" />
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
          <div className="text-center animate-in fade-in duration-500">
            <div className="flex items-center justify-center mb-8">
              <img 
                src={spottLogo} 
                alt="Spott" 
                className="h-24 w-auto object-contain"
              />
            </div>
            <h2 className="mt-3 text-2xl font-semibold">{t('auth:joinSpott')}</h2>
            <p className="mt-1 text-muted-foreground">{t('auth:joinSpottSubtitle')}</p>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 justify-center snap-x snap-mandatory animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <button
              type="button"
              onClick={() => handleMethodChange('email')}
              className={`snap-center px-6 py-2 text-sm rounded-full border transition-all duration-200 active:scale-95 ${
                method === 'email' 
                  ? 'bg-accent text-accent-foreground border-accent shadow-[0_2px_8px_rgba(0,0,0,0.1)] scale-105' 
                  : 'bg-background text-foreground border-input hover:border-accent/50'
              }`}
            >
              {t('auth:emailMethod')}
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange('phone')}
              className={`snap-center px-6 py-2 text-sm rounded-full border transition-all duration-200 active:scale-95 ${
                method === 'phone' 
                  ? 'bg-accent text-accent-foreground border-accent shadow-[0_2px_8px_rgba(0,0,0,0.1)] scale-105' 
                  : 'bg-background text-foreground border-input hover:border-accent/50'
              }`}
            >
              {t('auth:phoneMethod')}
            </button>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            {method === 'email' ? (
              <div>
                <Label htmlFor="email">{t('auth:email')}</Label>
                <div className="relative mt-1">
                  <Input 
                    id="email" 
                    type="email" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder={t('auth:emailPlaceholder')}
                    autoComplete="email"
                    className="pr-10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_0_0_2px_hsl(var(--ring))]"
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    {checking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {!checking && exists === false && <Check className="w-4 h-4 text-green-600 animate-in zoom-in duration-200" />}
                    {!checking && exists === true && <X className="w-4 h-4 text-destructive animate-in zoom-in duration-200" />}
                  </div>
                </div>
                {exists === true && (
                  <div className="mt-2 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
                    {t('auth:emailAlreadyInUse')} <button type="button" className="underline text-primary ml-1 active:scale-95 transition-transform" onClick={() => navigate('/auth?mode=login')}>{t('auth:signInButton')}</button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Label htmlFor="phone">{t('auth:phoneNumber')}</Label>
                <div className="relative mt-1">
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    placeholder={languages.find(l => l.code === i18n.language)?.phonePlaceholder || '+39 333 123 4567'}
                    autoComplete="tel"
                    className="pr-10 bg-background text-foreground shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_0_0_2px_hsl(var(--ring))]"
                  />
                  <div className="absolute inset-y-0 right-2 flex items-center">
                    {checking && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                    {!checking && exists === false && <Check className="w-4 h-4 text-green-600 animate-in zoom-in duration-200" />}
                    {!checking && exists === true && <X className="w-4 h-4 text-destructive animate-in zoom-in duration-200" />}
                  </div>
                </div>
                {exists === true && (
                  <div className="mt-2 text-sm text-destructive animate-in fade-in slide-in-from-top-2 duration-200">
                    {t('auth:phoneAlreadyInUse')} <button type="button" className="underline text-primary ml-1 active:scale-95 transition-transform" onClick={() => navigate('/auth?mode=login')}>{t('auth:signInButton')}</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <Button 
            disabled={!canContinue || loading} 
            onClick={sendCode} 
            className="w-full h-12 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] active:scale-[0.98] transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300"
          >
            {loading ? t('auth:sending') : exists ? (method === 'email' ? t('auth:emailAlreadyUsed') : t('auth:phoneAlreadyUsed')) : t('auth:sendCode')}
          </Button>

          <div className="text-center text-sm text-muted-foreground animate-in fade-in duration-500 delay-400">
            {t('auth:alreadyHaveAccount')}
            <Link to="/auth?mode=login" className="ml-1 text-primary underline active:scale-95 transition-transform inline-block">{t('auth:signInButton')}</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SignupStart;
