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
}

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { method, email, phone }: SendOTPRequest = await req.json();
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

      // Send email via Resend
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: "Spott <onboarding@resend.dev>",
        to: [email],
        subject: "Il tuo codice di verifica Spott",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Benvenuto su Spott!</h1>
            <p>Il tuo codice di verifica è:</p>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <h2 style="font-size: 32px; letter-spacing: 8px; margin: 0;">${code}</h2>
            </div>
            <p>Questo codice scadrà tra 10 minuti.</p>
            <p>Se non hai richiesto questo codice, ignora questa email.</p>
          </div>
        `,
      });

      if (emailError) {
        console.error("Resend error:", emailError);
        throw new Error(emailError.message || "Email provider error");
      }

      console.log("Email OTP sent:", { email, success: true, id: emailData?.id });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (method === 'phone' && phone) {

      // Send SMS via Vonage
      const vonageApiKey = Deno.env.get("VONAGE_API_KEY");
      const vonageApiSecret = Deno.env.get("VONAGE_API_SECRET");
      const vonageFrom = Deno.env.get("VONAGE_FROM") || "Spott";

      if (!vonageApiKey || !vonageApiSecret) {
        throw new Error("Vonage credentials not configured");
      }

      const vonageResponse = await fetch("https://rest.nexmo.com/sms/json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: vonageApiKey,
          api_secret: vonageApiSecret,
          to: phone.replace(/\D/g, ''),
          from: vonageFrom,
          text: `Il tuo codice Spott è: ${code}. Valido per 10 minuti.`,
        }),
      });

      const vonageData = await vonageResponse.json();
      console.log("SMS OTP sent:", { phone, success: vonageData.messages?.[0]?.status === "0" });

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
