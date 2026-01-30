import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { haptics } from '@/utils/haptics';

const SignupVerify: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const method = (params.get('method') as 'email' | 'phone') || 'email';
  const email = decodeURIComponent(params.get('email') || '');
  const phone = decodeURIComponent(params.get('phone') || '');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    document.title = 'Verify - Spott';
  }, []);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const verify = async () => {
    if (code.length < 6) return;
    haptics.impact('light');
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-otp', {
        body: {
          method,
          email: method === 'email' ? email : undefined,
          phone: method === 'phone' ? phone : undefined,
          code,
        }
      });

      if (error) throw error;
      if (!data?.success || !data?.sessionToken) throw new Error(t('signup:verificationFailed'));

      // Store session token and contact info in sessionStorage
      sessionStorage.setItem('signup_session', data.sessionToken);
      sessionStorage.setItem('signup_contact', method === 'email' ? email : phone);
      sessionStorage.setItem('signup_method', method);

      haptics.success();
      toast.success(t('signup:codeVerified'));
      navigate('/signup/profile');
    } catch (e: any) {
      haptics.error();
      toast.error(e?.message || t('signup:invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    if (resendCooldown > 0) return;
    haptics.impact('light');
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-otp', {
        body: {
          method,
          email: method === 'email' ? email : undefined,
          phone: method === 'phone' ? phone : undefined,
          language: i18n.language,
        }
      });

      if (error) throw error;
      haptics.success();
      toast.success(t('signup:newCodeSent'));
      setResendCooldown(60);
    } catch (e: any) {
      haptics.error();
      toast.error(e?.message || t('signup:sendError'));
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
            <h1 className="text-2xl font-semibold">{t('signup:enterCode')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('signup:codeSentTo')} {method === 'email' ? email : phone}
            </p>
          </div>

          <div className="flex justify-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot 
                    key={i} 
                    index={i} 
                    className="shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button 
            disabled={code.length < 6 || loading} 
            onClick={verify} 
            className="w-full h-12 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-[0_4px_14px_rgba(37,99,235,0.35)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.45)] active:scale-[0.98] transition-all duration-200 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200"
          >
            {loading ? t('signup:verifying') : t('signup:verify')}
          </Button>

          <Button 
            variant="ghost" 
            disabled={resendCooldown > 0 || loading} 
            onClick={resendCode} 
            className="w-full active:scale-95 transition-transform animate-in fade-in duration-500 delay-300"
          >
            <RefreshCw className="mr-2 w-4 h-4" />
            {resendCooldown > 0 ? t('signup:resendIn', { seconds: resendCooldown }) : t('signup:resendCode')}
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

export default SignupVerify;
