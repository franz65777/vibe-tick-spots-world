import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import languageIcon from '@/assets/icon-language.png';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'zh-CN', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'ar', label: 'العربية' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'ru', label: 'Русский' },
];

const phoneExamples: Record<string, string> = {
  en: '+44 7700 900123',
  es: '+34 612 34 56 78',
  fr: '+33 6 12 34 56 78',
  de: '+49 151 23456789',
  it: '+39 333 123 4567',
  pt: '+351 912 345 678',
  'zh-CN': '+86 138 0013 8000',
  ja: '+81 90 1234 5678',
  ko: '+82 10 1234 5678',
  ar: '+966 50 123 4567',
  hi: '+91 98765 43210',
  ru: '+7 912 345 67 89',
};

const SigninStart = () => {
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = 'Accedi - Spott';
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(identifier, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials' 
          ? t('auth:invalidCredentials', { defaultValue: 'Invalid login credentials' })
          : (error.message || t('auth:cannotSignIn', { defaultValue: 'Cannot sign in' }))
        );
      } else {
        toast.success(t('auth:welcomeBackMessage', { defaultValue: 'Welcome back!' }));
        navigate('/');
      }
    } catch (err) {
      toast.error(t('auth:cannotSignIn', { defaultValue: 'Error during sign in' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden pt-safe pb-safe">
      {/* Header with language selector */}
      <header className="p-4 flex items-center justify-end">
        <div className="w-40">
          <Select value={i18n.language} onValueChange={(v) => { i18n.changeLanguage(v); localStorage.setItem('i18nextLng', v); }}>
            <SelectTrigger className="h-9 rounded-full bg-background border border-input text-sm flex items-center gap-2" aria-label="Language selector">
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

      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 overscroll-contain [-webkit-overflow-scrolling:touch]">
        {/* Logo */}
        <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <h1 className="text-4xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent flex items-baseline">
                  SPOTT
                  <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
                </h1>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              {t('auth:welcomeBack')}
            </h2>
            <p className="text-muted-foreground">
              {t('auth:signInDiscover')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6 mt-8">
            <div>
              <Input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="h-12 bg-background text-foreground"
                placeholder={t('auth:loginPlaceholder')}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                {t('auth:password')}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10 bg-background text-foreground"
                  placeholder={t('auth:enterPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !identifier || !password}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              {loading ? t('auth:pleaseWait') : t('auth:signInButton')}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="text-center text-sm text-muted-foreground mt-6">
            {t('auth:dontHaveAccount')} {' '}
            <button
              onClick={() => navigate('/signup/start')}
              className="text-primary font-medium hover:opacity-80"
            >
              {t('auth:signUp')}
            </button>
          </div>
        </div>
      </div>
    );
  };

export default SigninStart;
