import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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

  const canCreate = useMemo(() => password.length >= 6 && password === confirm, [password, confirm]);

  const createAccount = async () => {
    if (!canCreate) return;
    setLoading(true);
    
    try {
      const sessionToken = sessionStorage.getItem('signup_session');
      const fullName = sessionStorage.getItem('signup_fullname');
      const username = sessionStorage.getItem('signup_username');
      const dob = sessionStorage.getItem('signup_dob');
      const gender = sessionStorage.getItem('signup_gender');
      const method = sessionStorage.getItem('signup_method');
      const contact = sessionStorage.getItem('signup_contact');

      if (!sessionToken || !fullName || !username || !dob || !gender || !method || !contact) {
        throw new Error(t('signup:incompleteData'));
      }

      // Store password temporarily for back navigation
      sessionStorage.setItem('signup_password', password);

      const payload: any = {
        sessionToken,
        fullName,
        username,
        dateOfBirth: dob,
        gender,
        password,
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
          // Account created but session failed - redirect to login
          toast.success(t('signup:accountCreated'));
          toast.info(t('signup:pleaseLogin') || 'Please log in with your new account');
          
          // Clear session storage
          sessionStorage.clear();
          navigate('/auth?mode=login');
          return;
        }

        console.log('New user logged in:', data.user?.id);
      } else {
        // Session not available - account created but user needs to log in manually
        console.log('Account created but no session returned');
        toast.success(t('signup:accountCreated'));
        toast.info(t('signup:pleaseLogin') || 'Please log in with your new account');
        
        // Clear session storage
        sessionStorage.clear();
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

      toast.success(t('signup:accountCreated'));
      navigate('/');
    } catch (e: any) {
      const errorMsg = e?.message || t('signup:errorCreating');
      toast.error(errorMsg);
      
      // Session expired or invalid - clear and restart signup
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
            <h1 className="text-2xl font-semibold">{t('signup:createPassword')}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t('signup:setPasswordDesc')}</p>
          </div>

          <div>
            <Label htmlFor="password">{t('signup:password')}</Label>
            <div className="relative mt-1">
              <Input id="password" type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('signup:passwordPlaceholder')} className="pr-10" />
              <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute inset-y-0 right-2 flex items-center">
                {showPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirm">{t('signup:confirmPassword')}</Label>
            <div className="relative mt-1">
              <Input id="confirm" type={showConfirm ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={t('signup:confirmPlaceholder')} className="pr-10 bg-background text-foreground" />
              <button type="button" onClick={() => setShowConfirm((s) => !s)} className="absolute inset-y-0 right-2 flex items-center">
                {showConfirm ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <Button disabled={!canCreate || loading} onClick={createAccount} className="w-full h-12 rounded-xl">
            {loading ? t('signup:creating') : t('signup:createAccount')}
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

export default SignupPassword;
