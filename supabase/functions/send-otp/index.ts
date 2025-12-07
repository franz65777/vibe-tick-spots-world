import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOTPRequest {
  method: 'email' | 'phone';
  email?: string;
  phone?: string;
  redirectUrl?: string;
  language?: string;
}

// Email translations
const emailTranslations: Record<string, {
  subject: string;
  title: string;
  description: string;
  expires: string;
  ignore: string;
  rights: string;
}> = {
  en: {
    subject: "Your Spott verification code",
    title: "Your verification code",
    description: "Use this code to complete your registration:",
    expires: "This code will expire in 10 minutes.",
    ignore: "If you didn't request this code, please ignore this email.",
    rights: "All rights reserved."
  },
  it: {
    subject: "Il tuo codice di verifica Spott",
    title: "Il tuo codice di verifica",
    description: "Usa questo codice per completare la registrazione:",
    expires: "Questo codice scadrà tra 10 minuti.",
    ignore: "Se non hai richiesto questo codice, ignora questa email.",
    rights: "Tutti i diritti riservati."
  },
  es: {
    subject: "Tu código de verificación de Spott",
    title: "Tu código de verificación",
    description: "Usa este código para completar tu registro:",
    expires: "Este código caducará en 10 minutos.",
    ignore: "Si no solicitaste este código, ignora este correo.",
    rights: "Todos los derechos reservados."
  },
  fr: {
    subject: "Votre code de vérification Spott",
    title: "Votre code de vérification",
    description: "Utilisez ce code pour compléter votre inscription :",
    expires: "Ce code expirera dans 10 minutes.",
    ignore: "Si vous n'avez pas demandé ce code, ignorez cet e-mail.",
    rights: "Tous droits réservés."
  },
  de: {
    subject: "Dein Spott-Verifizierungscode",
    title: "Dein Verifizierungscode",
    description: "Verwende diesen Code, um deine Registrierung abzuschließen:",
    expires: "Dieser Code läuft in 10 Minuten ab.",
    ignore: "Wenn du diesen Code nicht angefordert hast, ignoriere diese E-Mail.",
    rights: "Alle Rechte vorbehalten."
  },
  pt: {
    subject: "Seu código de verificação Spott",
    title: "Seu código de verificação",
    description: "Use este código para concluir seu registro:",
    expires: "Este código expirará em 10 minutos.",
    ignore: "Se você não solicitou este código, ignore este e-mail.",
    rights: "Todos os direitos reservados."
  },
  "zh-CN": {
    subject: "您的 Spott 验证码",
    title: "您的验证码",
    description: "使用此代码完成注册：",
    expires: "此代码将在10分钟后过期。",
    ignore: "如果您没有请求此代码，请忽略此电子邮件。",
    rights: "版权所有。"
  },
  ja: {
    subject: "Spott 認証コード",
    title: "認証コード",
    description: "このコードを使用して登録を完了してください：",
    expires: "このコードは10分後に期限切れになります。",
    ignore: "このコードをリクエストしていない場合は、このメールを無視してください。",
    rights: "All rights reserved."
  },
  ko: {
    subject: "Spott 인증 코드",
    title: "인증 코드",
    description: "이 코드를 사용하여 등록을 완료하세요:",
    expires: "이 코드는 10분 후에 만료됩니다.",
    ignore: "이 코드를 요청하지 않았다면 이 이메일을 무시하세요.",
    rights: "All rights reserved."
  },
  ar: {
    subject: "رمز التحقق الخاص بك من Spott",
    title: "رمز التحقق الخاص بك",
    description: "استخدم هذا الرمز لإكمال التسجيل:",
    expires: "سينتهي صلاحية هذا الرمز خلال 10 دقائق.",
    ignore: "إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد الإلكتروني.",
    rights: "جميع الحقوق محفوظة."
  },
  hi: {
    subject: "आपका Spott सत्यापन कोड",
    title: "आपका सत्यापन कोड",
    description: "पंजीकरण पूरा करने के लिए इस कोड का उपयोग करें:",
    expires: "यह कोड 10 मिनट में समाप्त हो जाएगा।",
    ignore: "यदि आपने इस कोड का अनुरोध नहीं किया है, तो इस ईमेल को अनदेखा करें।",
    rights: "सर्वाधिकार सुरक्षित।"
  },
  ru: {
    subject: "Ваш код подтверждения Spott",
    title: "Ваш код подтверждения",
    description: "Используйте этот код для завершения регистрации:",
    expires: "Этот код истечет через 10 минут.",
    ignore: "Если вы не запрашивали этот код, проигнорируйте это письмо.",
    rights: "Все права защищены."
  }
};

// SMS translations
const smsTranslations: Record<string, string> = {
  en: "Your Spott code is: {code}. Valid for 10 minutes.",
  it: "Il tuo codice Spott è: {code}. Valido per 10 minuti.",
  es: "Tu código Spott es: {code}. Válido por 10 minutos.",
  fr: "Votre code Spott est : {code}. Valide 10 minutes.",
  de: "Dein Spott-Code ist: {code}. Gültig für 10 Minuten.",
  pt: "Seu código Spott é: {code}. Válido por 10 minutos.",
  "zh-CN": "您的 Spott 代码是：{code}。有效期10分钟。",
  ja: "Spott コード: {code}。10分間有効です。",
  ko: "Spott 코드: {code}. 10분간 유효합니다.",
  ar: "رمز Spott الخاص بك هو: {code}. صالح لمدة 10 دقائق.",
  hi: "आपका Spott कोड है: {code}। 10 मिनट के लिए मान्य।",
  ru: "Ваш код Spott: {code}. Действителен 10 минут."
};

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const getTranslation = (lang: string) => {
  // Normalize language code (e.g., 'zh-CN' stays as is, but 'en-US' becomes 'en')
  const normalizedLang = lang.includes('-') && !emailTranslations[lang] 
    ? lang.split('-')[0] 
    : lang;
  return emailTranslations[normalizedLang] || emailTranslations['en'];
};

const getSmsText = (lang: string, code: string) => {
  const normalizedLang = lang.includes('-') && !smsTranslations[lang] 
    ? lang.split('-')[0] 
    : lang;
  const template = smsTranslations[normalizedLang] || smsTranslations['en'];
  return template.replace('{code}', code);
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { method, email, phone, redirectUrl, language = 'en' }: SendOTPRequest = await req.json();
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const identifier = email || phone;

    if (!identifier) {
      throw new Error("Missing email or phone");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete any existing OTP for this identifier
    await supabase.from('otp_codes').delete().eq('identifier', identifier);

    // Store OTP in database
    const { error: dbError } = await supabase.from('otp_codes').insert({
      identifier,
      code,
      expires_at: expiresAt.toISOString()
    });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to store OTP");
    }

    if (method === 'email' && email) {
      const t = getTranslation(language);
      const baseUrl = redirectUrl || 'https://spott.cloud';
      let devMode = false;

      try {
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: "Spott <noreply@spott.cloud>",
          to: [email],
          subject: t.subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #2563eb; text-align: center;">SPOTT</h1>
              <div style="background-color: #f8fafc; border-radius: 10px; padding: 30px; margin: 20px 0;">
                <h2 style="color: #1e293b; margin-top: 0;">${t.title}</h2>
                <p style="color: #475569; font-size: 16px;">${t.description}</p>
                <div style="background-color: white; border: 2px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px;">${code}</span>
                </div>
                <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">${t.expires}</p>
                <p style="color: #64748b; font-size: 14px; margin-top: 10px;">${t.ignore}</p>
              </div>
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
                © 2025 SPOTT. ${t.rights}<br/>
                <a href="${baseUrl}" style="color: #2563eb; text-decoration: none;">spott.cloud</a>
              </p>
            </div>
          `,
        });

        if (emailError) {
          console.error("Resend error:", emailError);
          const errorMsg = emailError.message || '';
          const statusCode = (emailError as any).statusCode;
          if (statusCode === 403 && errorMsg.includes('only send testing emails')) {
            console.log("DEV MODE: Domain not verified, OTP saved but email not sent");
            devMode = true;
          } else {
            throw new Error(emailError.message || "Email provider error");
          }
        } else {
          console.log("Email OTP sent:", { email, language, success: true, id: emailData?.id });
        }
      } catch (error: any) {
        console.error("Email sending error:", error);
        if (error.message && error.message.includes('only send testing emails')) {
          console.log("DEV MODE: Caught domain error, continuing in dev mode");
          devMode = true;
        } else {
          throw error;
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        devMode,
        ...(devMode && { devCode: code })
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (method === 'phone' && phone) {
      const vonageApiKey = Deno.env.get("VONAGE_API_KEY");
      const vonageApiSecret = Deno.env.get("VONAGE_API_SECRET");
      const vonageFrom = Deno.env.get("VONAGE_FROM") || "Spott";

      if (!vonageApiKey || !vonageApiSecret) {
        throw new Error("Vonage credentials not configured");
      }

      const smsText = getSmsText(language, code);

      const vonageResponse = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: vonageApiKey,
          api_secret: vonageApiSecret,
          to: phone.replace(/\D/g, ''),
          from: vonageFrom,
          text: smsText,
        }),
      });

      const vonageData = await vonageResponse.json();
      console.log("SMS OTP sent:", { phone, language, success: vonageData.messages?.[0]?.status === "0" });

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    throw new Error("Invalid method or missing contact info");
  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);