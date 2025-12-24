import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import languageIcon from '@/assets/icon-language.png';
import spottLogo from '@/assets/spott-logo.png';
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

const SigninStart = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = `${t('auth:signIn')} - Spott`;
  }, [t]);

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
          ? t('auth:invalidCredentials')
          : (error.message || t('auth:cannotSignIn'))
        );
      } else {
        sessionStorage.setItem('playSplashAfterAuth', 'true');
        sessionStorage.removeItem('hasSeenSplash');
        toast.success(t('auth:welcomeBackMessage'));
        navigate('/');
      }
    } catch (err) {
      toast.error(t('auth:cannotSignIn'));
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
            <img 
              src={spottLogo} 
              alt="Spott" 
              className="h-24 w-auto object-contain"
            />
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
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full"
          >
            {loading ? t('auth:pleaseWait') : t('auth:signInButton')}
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/forgot-password')}
              className="text-sm text-muted-foreground hover:opacity-80"
            >
              {t('auth:forgotPassword')}
            </button>
          </div>
        </form>

        {/* Create new account button */}
        <div className="mt-auto pt-8 pb-4">
          <Button
            variant="outline"
            onClick={() => navigate('/signup/start')}
            className="w-full h-12 rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium"
          >
            {t('auth:createNewAccount')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SigninStart;
