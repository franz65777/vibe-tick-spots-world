import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSignUp = () => {
    navigate('/auth?mode=signup');
  };

  const handleLogin = () => {
    navigate('/auth?mode=login');
  };

  return (
    <main className="min-h-screen bg-background">
      <section className="flex flex-col items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-md space-y-8 text-center">
          <header className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <h1 className="text-5xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent relative flex items-baseline">
                  SPOTT
                  <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
                </h1>
              </div>
            </div>

            <h2 className="text-lg font-medium bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 bg-clip-text text-transparent">
              {t('auth:discoverShare', { defaultValue: 'Discover & share places' })}
            </h2>
          </header>

          <section className="space-y-4">
            <p className="text-lg text-foreground leading-relaxed">
              {t('auth:signInDiscover', { defaultValue: 'Sign in to discover amazing places' })}
            </p>
          </section>

          <section className="space-y-4 pt-8">
            <Button
              onClick={handleLogin}
              className="w-full h-12 bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 hover:from-blue-900 hover:via-blue-700 hover:to-blue-500 text-white font-medium"
            >
              <LogIn className="w-5 h-5 mr-2" />
              {t('auth:signIn', { defaultValue: 'Sign In' })}
            </Button>

            <Button
              onClick={handleSignUp}
              variant="outline"
              className="w-full h-12 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-medium"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              {t('auth:signUp', { defaultValue: 'Sign up' })}
            </Button>
          </section>

          <section className="pt-8 text-center text-xs text-muted-foreground">
            {t('auth:byContinuing', { defaultValue: 'By continuing, you agree to our' })}{' '}
            <button onClick={() => navigate('/terms')} className="text-primary hover:underline font-medium">
              {t('auth:termsOfService', { defaultValue: 'Terms of Service' })}
            </button>{' '}
            {t('auth:and', { defaultValue: 'and' })}{' '}
            <button onClick={() => navigate('/privacy')} className="text-primary hover:underline font-medium">
              {t('auth:privacyPolicy', { defaultValue: 'Privacy Policy' })}
            </button>
          </section>
        </div>
      </section>
    </main>
  );
};

export default WelcomePage;
