import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, MapPin, ArrowLeft, Building } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authTranslations } from '@/i18n-auth';
import { authTranslationsExtended } from '@/i18n-auth-extended';

const AuthPage = () => {
  const { t, i18n } = useTranslation(['auth']);
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [accountType, setAccountType] = useState<'free' | 'business'>('free');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'en');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      // Reindirizza al nuovo flusso progressivo di signup
      navigate('/signup/start', { replace: true });
      return;
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [searchParams, navigate]);

  const checkUsernameAvailability = async (username: string): Promise<boolean> => {
    if (!username.trim()) return true;
    
    const { supabase } = await import('@/integrations/supabase/client');
    const normalizedUsername = username.trim().toLowerCase();
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('username', normalizedUsername);

    if (error) {
      return false; // fail-safe: consider taken when in doubt
    }
    return (count ?? 0) === 0;
  };

  const handleUsernameChange = async (newUsername: string) => {
    const lowercaseUsername = newUsername.toLowerCase();
    setUsername(lowercaseUsername);
    setUsernameError(null);
    
    if (lowercaseUsername.trim() === '') {
      setCheckingUsername(false);
      return;
    }
    
    setCheckingUsername(true);
    const isAvailable = await checkUsernameAvailability(lowercaseUsername);
    setCheckingUsername(false);
    
    if (!isAvailable) {
      setUsernameError(t('auth:usernameAlreadyTaken'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(loginEmail, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success(t('auth:welcomeBackMessage'));
          navigate('/');
        }
      } else {
        // Validation for signup
        if (password !== confirmPassword) {
          toast.error(t('auth:passwordsNotMatch'));
          setLoading(false);
          return;
        }

        if (password.length < 6) {
          toast.error(t('auth:passwordMinLength'));
          setLoading(false);
          return;
        }

        if (accountType === 'business' && (!businessName || !businessType)) {
          toast.error(t('auth:fillBusinessInfo'));
          setLoading(false);
          return;
        }

        if (usernameError) {
          toast.error(t('common:usernameAlreadyTaken'));
          setLoading(false);
          return;
        }

        const normalizedUsername = username.trim().toLowerCase();
        const isUsernameAvailable = await checkUsernameAvailability(normalizedUsername);
        if (!isUsernameAvailable) {
          setUsernameError(t('common:usernameAlreadyTaken'));
          toast.error(t('common:usernameAlreadyTaken'));
          setLoading(false);
          return;
        }

        const normalizedUsernameForSignup = username.trim().toLowerCase();
        const metadata: any = {
          full_name: fullName,
          username: normalizedUsernameForSignup,
          account_type: accountType,
        };

        if (accountType === 'business') {
          metadata.business_name = businessName;
          metadata.business_type = businessType;
        }

        const { error } = await signUp(email, password, fullName, normalizedUsernameForSignup, language);
        if (error) {
          toast.error(error.message);
        } else {
          if (accountType === 'business') {
            toast.success(t('auth:businessAccountCreated'));
            // Redirect to subscription page for business accounts
            setTimeout(() => {
              navigate('/subscription');
            }, 1500);
          } else {
            toast.success(t('auth:accountCreated'));
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      {/* Header with back button */}
      <div className="flex items-center p-4 flex-shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          {t('auth:back')}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-8 overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Logo and title */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <h1 className="text-4xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent flex items-baseline">
                  SPOTT
                  <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
                </h1>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {isLogin ? t('auth:welcomeBack') : t('auth:createAccount')}
            </h2>
            <p className="text-gray-600">
              {isLogin
                ? t('auth:signInDiscover')
                : t('auth:joinSpott')
              }
            </p>
          </div>

          {/* Account type selector for signup */}
          {!isLogin && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">{t('auth:accountType')}</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('free')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    accountType === 'free'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MapPin className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">{t('auth:freeUser')}</div>
                  <div className="text-xs text-gray-500">{t('auth:discoverShare')}</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('business')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    accountType === 'business'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">{t('auth:business')}</div>
                  <div className="text-xs text-gray-500">{t('auth:businessTrial')}</div>
                </button>
              </div>
              {accountType === 'business' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    {t('auth:businessTrialDesc')}
                  </p>
                </div>
              )}

              {/* Language selection */}
              <div>
                <Label className="text-sm font-medium text-gray-700">{t('auth:language')}</Label>
                <select
                  value={language}
                  onChange={(e) => {
                    const newLang = e.target.value;
                    setLanguage(newLang);
                    i18n.changeLanguage(newLang);
                  }}
                  className="mt-1 h-12 w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="it">Italiano</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                  <option value="ja">日本語</option>
                  <option value="ko">한국어</option>
                  <option value="ar">العربية</option>
                  <option value="hi">हिन्दी</option>
                  <option value="ru">Русский</option>
                  <option value="zh">中文</option>
                </select>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                    {t('auth:fullName')}
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder={t('auth:enterFullName')}
                  />
                </div>

                <div>
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    {t('auth:username')}
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    required={!isLogin}
                    className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder={t('auth:chooseUsername')}
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    autoComplete="username"
                  />
                  {checkingUsername && (
                    <p className="mt-1 text-xs text-muted-foreground">{t('common:checkingAvailability')}</p>
                  )}
                  {usernameError && (
                    <p className="mt-1 text-xs text-destructive">{usernameError}</p>
                  )}
                </div>

                {accountType === 'business' && (
                  <>
                    <div>
                      <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                        {t('auth:businessName')}
                      </Label>
                      <Input
                        id="businessName"
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required={accountType === 'business'}
                        className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder={t('auth:enterBusinessName')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="businessType" className="text-sm font-medium text-gray-700">
                        {t('auth:businessType')}
                      </Label>
                      <select
                        id="businessType"
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        required={accountType === 'business'}
                        className="mt-1 h-12 w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">{t('auth:selectBusinessType')}</option>
                        <option value="restaurant">{t('auth:restaurant')}</option>
                        <option value="hotel">{t('auth:hotel')}</option>
                        <option value="cafe">{t('auth:cafe')}</option>
                        <option value="bar">{t('auth:bar')}</option>
                        <option value="shop">{t('auth:shop')}</option>
                        <option value="attraction">{t('auth:attraction')}</option>
                        <option value="other">{t('auth:other')}</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    {t('auth:email')}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!isLogin}
                    className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder={t('auth:enterEmail')}
                  />
                </div>
              </>
            )}

            {isLogin && (
              <div>
                <Label htmlFor="loginEmail" className="text-sm font-medium text-gray-700">
                  {t('auth:emailAddress')}
                </Label>
                <Input
                  id="loginEmail"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  required={isLogin}
                  className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder={t('auth:enterEmailAddress')}
                />
                <p className="mt-1 text-xs text-gray-500">
                  {t('auth:emailSecurity')}
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                {t('auth:password')}
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder={t('auth:enterPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  {t('auth:confirmPassword')}
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    className="h-12 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder={t('auth:confirmYourPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 hover:from-blue-900 hover:via-blue-700 hover:to-blue-500 text-white font-medium"
            >
              {loading ? t('auth:pleaseWait') : (isLogin ? t('auth:signIn') : t('auth:createAccountButton'))}
            </Button>
          </form>

          {/* Toggle between login and signup */}
          <div className="text-center">
            <p className="text-gray-600">
              {isLogin ? t('auth:dontHaveAccount') : t('auth:alreadyHaveAccount')}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  navigate(`/auth?mode=${!isLogin ? 'login' : 'signup'}`);
                }}
                className="ml-2 font-medium text-blue-600 hover:text-blue-500"
              >
                {isLogin ? t('auth:signUp') : t('auth:signInButton')}
              </button>
            </p>
          </div>

          {/* Terms and Privacy */}
          <div className="text-center text-xs text-gray-500">
            {t('auth:byContinuing')}{' '}
            <button
              onClick={() => navigate('/terms')}
              className="text-blue-600 hover:underline"
            >
              {t('auth:termsOfService')}
            </button>{' '}
            {t('auth:and')}{' '}
            <button
              onClick={() => navigate('/privacy')}
              className="text-blue-600 hover:underline"
            >
              {t('auth:privacyPolicy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
