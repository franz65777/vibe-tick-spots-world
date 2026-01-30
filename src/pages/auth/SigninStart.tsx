import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, EyeOff, Scan } from 'lucide-react';
import languageIcon from '@/assets/icon-language.png';
import spottLogo from '@/assets/spott-logo.png';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { haptics } from '@/utils/haptics';
import {
  isBiometricAvailable,
  hasStoredCredentials,
  authenticateAndGetCredentials,
  saveCredentials,
  getBiometricName,
} from '@/services/biometricAuth';

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
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricName, setBiometricName] = useState('Biometric');
  const [biometricLoading, setBiometricLoading] = useState(false);
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

  // Load remembered email
  useEffect(() => {
    const savedEmail = localStorage.getItem('spott_remembered_email');
    if (savedEmail) {
      setIdentifier(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Check biometric availability
  useEffect(() => {
    const checkBiometric = async () => {
      const available = await isBiometricAvailable();
      const hasCredentials = await hasStoredCredentials();
      setBiometricAvailable(available && hasCredentials);
      
      if (available) {
        const name = await getBiometricName();
        setBiometricName(name);
      }
    };
    checkBiometric();
  }, []);

  const handleBiometricLogin = async () => {
    haptics.impact('light');
    setBiometricLoading(true);
    
    try {
      const credentials = await authenticateAndGetCredentials(t('auth:signInWithBiometric'));
      
      if (credentials) {
        const { error } = await signIn(credentials.username, credentials.password);
        if (error) {
          toast.error(t('auth:invalidCredentials'));
        } else {
          haptics.success();
          sessionStorage.setItem('playSplashAfterAuth', 'true');
          sessionStorage.removeItem('hasSeenSplash');
          toast.success(t('auth:welcomeBackMessage'));
          navigate('/');
        }
      }
    } catch (err) {
      toast.error(t('auth:biometricFailed'));
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    haptics.impact('light');
    setLoading(true);

    try {
      const { error } = await signIn(identifier, password);
      if (error) {
        haptics.error();
        toast.error(error.message === 'Invalid login credentials' 
          ? t('auth:invalidCredentials')
          : (error.message || t('auth:cannotSignIn'))
        );
      } else {
        haptics.success();
        
        // Handle remember me
        if (rememberMe) {
          localStorage.setItem('spott_remembered_email', identifier);
        } else {
          localStorage.removeItem('spott_remembered_email');
        }
        
        // Save credentials for biometric login
        await saveCredentials(identifier, password);
        
        sessionStorage.setItem('playSplashAfterAuth', 'true');
        sessionStorage.removeItem('hasSeenSplash');
        toast.success(t('auth:welcomeBackMessage'));
        navigate('/');
      }
    } catch (err) {
      haptics.error();
      toast.error(t('auth:cannotSignIn'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordToggle = () => {
    haptics.selection();
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = () => {
    haptics.selection();
    navigate('/forgot-password');
  };

  return (
    <div className="h-screen bg-[#F5F1EA] dark:bg-background flex flex-col overflow-hidden pt-safe pb-safe">
      {/* Header with language selector */}
      <header className="p-4 flex items-center justify-end">
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

      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4 overscroll-contain [-webkit-overflow-scrolling:touch]">
        {/* Logo */}
        <div className="text-center animate-in fade-in duration-500">
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
        <form onSubmit={handleSubmit} className="space-y-5 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <div>
            <Input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="h-12 bg-background text-foreground shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_0_0_2px_hsl(var(--ring))]"
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
                className="h-12 pr-10 bg-background text-foreground shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_0_0_2px_hsl(var(--ring))]"
                placeholder={t('auth:enterPassword')}
              />
              <button
                type="button"
                onClick={handlePasswordToggle}
                className="absolute inset-y-0 right-0 flex items-center pr-3 active:scale-95 transition-transform"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
          </div>

          {/* Remember me checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => {
                haptics.selection();
                setRememberMe(checked as boolean);
              }}
            />
            <label
              htmlFor="remember"
              className="text-sm text-muted-foreground cursor-pointer"
            >
              {t('auth:rememberMe', { defaultValue: 'Remember me' })}
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading || !identifier || !password}
            className="w-full h-12 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium rounded-full shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] active:scale-[0.98] transition-all duration-200"
          >
            {loading ? t('auth:pleaseWait') : t('auth:signInButton')}
          </Button>

          {/* Biometric login */}
          {biometricAvailable && (
            <>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t('auth:or', { defaultValue: 'or' })}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
              
              <Button
                type="button"
                variant="outline"
                onClick={handleBiometricLogin}
                disabled={biometricLoading}
                className="w-full h-12 rounded-full border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] active:scale-[0.98] transition-all duration-200"
              >
                <Scan className="w-5 h-5 mr-2" />
                {biometricLoading ? t('auth:pleaseWait') : t('auth:signInWith', { method: biometricName, defaultValue: `Sign in with ${biometricName}` })}
              </Button>
            </>
          )}

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-muted-foreground hover:opacity-80 active:scale-95 transition-all"
            >
              {t('auth:forgotPassword')}
            </button>
          </div>
        </form>

        {/* Create new account button */}
        <div className="mt-auto pt-8 pb-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <Button
            variant="outline"
            onClick={() => {
              haptics.impact('light');
              navigate('/signup/start');
            }}
            className="w-full h-12 rounded-full border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 font-medium shadow-[0_2px_8px_rgba(37,99,235,0.15)] hover:shadow-[0_4px_12px_rgba(37,99,235,0.25)] active:scale-[0.98] transition-all duration-200"
          >
            {t('auth:createNewAccount')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SigninStart;
