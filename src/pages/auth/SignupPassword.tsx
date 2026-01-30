import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/utils/haptics';

interface PasswordRequirement {
  label: string;
  met: boolean;
}

const SignupPassword: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { document.title = 'Create Password - Spott'; }, []);
  
  useEffect(() => {
    const session = sessionStorage.getItem('signup_session');
    if (!session) {
      navigate('/signup/start');
      return;
    }
    // Only restore password when navigating back
    const isNavigatingBack = sessionStorage.getItem('signup_nav_back');
    if (isNavigatingBack === 'true') {
      const savedPassword = sessionStorage.getItem('signup_password');
      if (savedPassword) setPassword(savedPassword);
      sessionStorage.removeItem('signup_nav_back');
    }
  }, [navigate]);

  // Password requirements
  const requirements: PasswordRequirement[] = useMemo(() => [
    { label: t('signup:minLength', { defaultValue: 'At least 6 characters' }), met: password.length >= 6 },
    { label: t('signup:hasUppercase', { defaultValue: 'Contains uppercase letter' }), met: /[A-Z]/.test(password) },
    { label: t('signup:hasNumber', { defaultValue: 'Contains a number' }), met: /[0-9]/.test(password) },
  ], [password, t]);

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    const metCount = requirements.filter(r => r.met).length;
    if (metCount === 0) return { level: 0, label: '', color: 'bg-muted' };
    if (metCount === 1) return { level: 1, label: t('signup:weak', { defaultValue: 'Weak' }), color: 'bg-red-500' };
    if (metCount === 2) return { level: 2, label: t('signup:medium', { defaultValue: 'Medium' }), color: 'bg-orange-500' };
    return { level: 3, label: t('signup:strong', { defaultValue: 'Strong' }), color: 'bg-green-500' };
  }, [requirements, t]);

  const canCreate = useMemo(() => password.length >= 6 && password === confirm, [password, confirm]);

  const handleTogglePw = () => {
    haptics.selection();
    setShowPw((s) => !s);
  };

  const handleToggleConfirm = () => {
    haptics.selection();
    setShowConfirm((s) => !s);
  };

  const createAccount = async () => {
    if (!canCreate) return;
    haptics.impact('light');
    setLoading(true);
    
    try {
      const sessionToken = sessionStorage.getItem('signup_session');
      const fullName = sessionStorage.getItem('signup_fullname');
      const username = sessionStorage.getItem('signup_username');
      const dob = sessionStorage.getItem('signup_dob');
      const gender = sessionStorage.getItem('signup_gender');
      const method = sessionStorage.getItem('signup_method');
      const contact = sessionStorage.getItem('signup_contact');
      const language = sessionStorage.getItem('signup_language') || localStorage.getItem('i18nextLng') || 'en';

      if (!sessionToken || !fullName || !username || !dob || !gender || !method || !contact) {
        throw new Error(t('signup:incompleteData'));
      }

      // Store password temporarily for back navigation
      sessionStorage.setItem('signup_password', password);

      // Get referral code if present
      const referralCode = sessionStorage.getItem('signup_referral_code');

      const payload: any = {
        sessionToken,
        fullName,
        username,
        dateOfBirth: dob,
        gender,
        password,
        language,
        referralCode,
      };

      if (method === 'email') {
        payload.email = contact;
      } else {
        payload.phone = contact;
      }

      const { data, error } = await supabase.functions.invoke('complete-signup', {
        body: payload
      });

      if (error) {
        haptics.error();
        let msg = error.message || t('signup:errorCreating');
        try {
          // @ts-ignore
          if (error.context?.json) {
            // @ts-ignore
            const body = await error.context.json();
            if (body?.error) msg = body.error;
          } else {
            const parsed = JSON.parse(msg);
            if (parsed?.error) msg = parsed.error;
          }
        } catch {}

        toast.error(msg);
        
        // Session expired or invalid - clear and restart signup
        if (/sessione|session/i.test(msg)) {
          sessionStorage.removeItem('signup_session');
          sessionStorage.removeItem('signup_fullname');
          sessionStorage.removeItem('signup_username');
          sessionStorage.removeItem('signup_dob');
          sessionStorage.removeItem('signup_gender');
          sessionStorage.removeItem('signup_method');
          sessionStorage.removeItem('signup_contact');
          sessionStorage.removeItem('signup_password');
          navigate('/signup/start');
          return;
        }
        
        if (/telefono|phone/i.test(msg)) {
          sessionStorage.setItem('signup_nav_back', 'true');
          navigate('/signup/start');
          return;
        }
        if (/username/i.test(msg)) {
          sessionStorage.setItem('signup_nav_back', 'true');
          navigate('/signup/profile');
        }
        return;
      }

      if (!data?.success) {
        haptics.error();
        toast.error(data?.error || t('signup:errorCreating'));
        return;
      }

      // Try to set the new user's session if available
      if (data.session) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        if (sessionError) {
          console.error('Session set error:', sessionError);
          toast.success(t('signup:accountCreated'));
          toast.info(t('signup:pleaseLogin') || 'Please log in with your new account');
          
          // Clear signup-related session storage
          sessionStorage.removeItem('signup_session');
          sessionStorage.removeItem('signup_fullname');
          sessionStorage.removeItem('signup_username');
          sessionStorage.removeItem('signup_dob');
          sessionStorage.removeItem('signup_gender');
          sessionStorage.removeItem('signup_method');
          sessionStorage.removeItem('signup_contact');
          sessionStorage.removeItem('signup_password');
          sessionStorage.removeItem('signup_language');
          navigate('/auth?mode=login');
          return;
        }

        console.log('New user logged in:', data.user?.id);
      } else {
        console.log('Account created but no session returned');
        toast.success(t('signup:accountCreated'));
        toast.info(t('signup:pleaseLogin') || 'Please log in with your new account');
        
        sessionStorage.removeItem('signup_session');
        sessionStorage.removeItem('signup_fullname');
        sessionStorage.removeItem('signup_username');
        sessionStorage.removeItem('signup_dob');
        sessionStorage.removeItem('signup_gender');
        sessionStorage.removeItem('signup_method');
        sessionStorage.removeItem('signup_contact');
        sessionStorage.removeItem('signup_password');
        sessionStorage.removeItem('signup_language');
        navigate('/auth?mode=login');
        return;
      }

      // Clear session storage
      sessionStorage.removeItem('signup_session');
      sessionStorage.removeItem('signup_fullname');
      sessionStorage.removeItem('signup_username');
      sessionStorage.removeItem('signup_dob');
      sessionStorage.removeItem('signup_gender');
      sessionStorage.removeItem('signup_method');
      sessionStorage.removeItem('signup_contact');
      sessionStorage.removeItem('signup_password');
      sessionStorage.removeItem('signup_referral_code');

      haptics.success();
      toast.success(t('signup:accountCreated'));
      navigate('/');
    } catch (e: any) {
      haptics.error();
      const errorMsg = e?.message || t('signup:errorCreating');
      toast.error(errorMsg);
      
      if (/sessione|session|401|scadut/i.test(errorMsg)) {
        sessionStorage.removeItem('signup_session');
        sessionStorage.removeItem('signup_fullname');
        sessionStorage.removeItem('signup_username');
        sessionStorage.removeItem('signup_dob');
        sessionStorage.removeItem('signup_gender');
        sessionStorage.removeItem('signup_method');
        sessionStorage.removeItem('signup_contact');
        sessionStorage.removeItem('signup_password');
        navigate('/signup/start');
      }
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
            <h1 className="text-2xl font-semibold">{t('signup:createPassword')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('signup:setPasswordDesc')}</p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <Label htmlFor="password">{t('signup:password')}</Label>
            <div className="relative mt-1">
              <Input 
                id="password" 
                type={showPw ? 'text' : 'password'} 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder={t('signup:passwordPlaceholder')} 
                className="pr-10 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_0_0_2px_hsl(var(--ring))]" 
              />
              <button 
                type="button" 
                onClick={handleTogglePw} 
                className="absolute inset-y-0 right-2 flex items-center active:scale-95 transition-transform"
              >
                {showPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>

            {/* Password strength indicator */}
            {password.length > 0 && (
              <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Strength bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.level / 3) * 100}%` }}
                    />
                  </div>
                  {passwordStrength.label && (
                    <span className={`text-xs font-medium ${
                      passwordStrength.level === 1 ? 'text-red-500' :
                      passwordStrength.level === 2 ? 'text-orange-500' :
                      'text-green-500'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  )}
                </div>

                {/* Requirements list */}
                <div className="space-y-1">
                  {requirements.map((req, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
                        req.met ? 'text-green-600' : 'text-muted-foreground'
                      }`}
                    >
                      {req.met ? (
                        <Check className="w-3 h-3 animate-in zoom-in duration-200" />
                      ) : (
                        <X className="w-3 h-3" />
                      )}
                      {req.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
            <Label htmlFor="confirm">{t('signup:confirmPassword')}</Label>
            <div className="relative mt-1">
              <Input 
                id="confirm" 
                type={showConfirm ? 'text' : 'password'} 
                value={confirm} 
                onChange={(e) => setConfirm(e.target.value)} 
                placeholder={t('signup:confirmPlaceholder')} 
                className="pr-10 bg-background text-foreground shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),0_0_0_2px_hsl(var(--ring))]" 
              />
              <button 
                type="button" 
                onClick={handleToggleConfirm} 
                className="absolute inset-y-0 right-2 flex items-center active:scale-95 transition-transform"
              >
                {showConfirm ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
            {confirm.length > 0 && password !== confirm && (
              <p className="text-xs text-destructive mt-1 animate-in fade-in duration-200">
                {t('signup:passwordsNotMatch', { defaultValue: 'Passwords do not match' })}
              </p>
            )}
          </div>

          <Button 
            disabled={!canCreate || loading} 
            onClick={createAccount} 
            className="w-full h-12 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] active:scale-[0.98] transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300"
          >
            {loading ? t('signup:creating') : t('signup:createAccount')}
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

export default SignupPassword;
