import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import spottLogo from '@/assets/spott-logo.png';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

// Production URL for password reset - always redirect to spott.cloud
const PRODUCTION_RESET_URL = 'https://spott.cloud/forgot-password?type=recovery';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordResetSuccess, setPasswordResetSuccess] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const [isResetMode, setIsResetMode] = useState(false);

  useEffect(() => {
    const qpType = searchParams.get('type');
    const hash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
    const hashParams = new URLSearchParams(hash || '');
    const type = qpType || hashParams.get('type');

    setIsResetMode(type === 'recovery');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [searchParams]);

  useEffect(() => {
    document.title = `${t('auth:resetPassword')} - Spott`;
  }, [t]);

  const handleSendResetLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: PRODUCTION_RESET_URL,
      });
      
      if (error) throw error;
      
      setEmailSent(true);
      toast.success(t('auth:resetLinkSent'));
    } catch (err: any) {
      toast.error(err.message || t('auth:resetLinkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error(t('auth:passwordsNotMatch'));
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error(t('auth:passwordMinLength'));
      return;
    }
    
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success(t('auth:passwordUpdated'));
      setPasswordResetSuccess(true);
    } catch (err: any) {
      toast.error(err.message || t('auth:passwordUpdateError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden pt-safe pb-safe">
      <header className="p-4 flex items-center justify-start">
        <Button variant="ghost" size="sm" onClick={() => navigate('/auth')} className="text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('auth:backToLogin')}
        </Button>
      </header>

      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-8">
            <img 
              src={spottLogo} 
              alt="Spott" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            {t('auth:resetPassword')}
          </h2>
          <p className="text-muted-foreground">
            {isResetMode ? t('auth:enterNewPassword') : t('auth:resetPasswordDesc')}
          </p>
        </div>

        {!isResetMode ? (
          // Request reset link form
          emailSent ? (
            <div className="text-center mt-8 space-y-4">
              <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <p className="text-green-600 dark:text-green-400">{t('auth:resetLinkSent')}</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/auth')} className="mt-4">
                {t('auth:backToLogin')}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendResetLink} className="space-y-6 mt-8">
              <div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-background text-foreground"
                  placeholder={t('auth:emailPlaceholder')}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full"
              >
                {loading ? t('auth:pleaseWait') : t('auth:sendResetLink')}
              </Button>
            </form>
          )
        ) : passwordResetSuccess ? (
          // Success message after password reset
          <div className="text-center mt-8 space-y-6">
            <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-4xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-green-600 dark:text-green-400 mb-2">
                {t('auth:passwordUpdated')}
              </h3>
              <p className="text-muted-foreground">
                {t('auth:returnToAppMessage', 'You can now close this page and return to the Spott app to log in with your new password.')}
              </p>
            </div>
          </div>
        ) : (
          // Update password form
          <form onSubmit={handleUpdatePassword} className="space-y-6 mt-8">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                {t('auth:newPassword')}
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="h-12 pr-10 bg-background text-foreground"
                  placeholder={t('auth:enterNewPassword')}
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

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                {t('auth:confirmPassword')}
              </label>
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 bg-background text-foreground"
                placeholder={t('auth:confirmYourPassword')}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !newPassword || !confirmPassword}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              {loading ? t('auth:pleaseWait') : t('auth:updatePassword')}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
