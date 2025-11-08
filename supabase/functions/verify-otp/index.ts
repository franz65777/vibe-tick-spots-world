import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOTPRequest {
  method: 'email' | 'phone';
  email?: string;
  phone?: string;
  code: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { method, email, phone, code }: VerifyOTPRequest = await req.json();
    const identifier = email || phone;

    if (!identifier) {
      throw new Error("Missing email or phone");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check OTP in database
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('identifier', identifier)
      .is('session_token', null)
      .single();

    if (fetchError || !otpRecord) {
      return new Response(
        JSON.stringify({ error: "Codice non trovato o scaduto" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check expiration
    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from('otp_codes').delete().eq('id', otpRecord.id);
      return new Response(
        JSON.stringify({ error: "Codice scaduto" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Verify code
    if (otpRecord.code !== code) {
      return new Response(
        JSON.stringify({ error: "Codice non valido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create a temporary session token (expires in 30 min)
    const sessionToken = crypto.randomUUID();
    const sessionExpiresAt = new Date(Date.now() + 30 * 60 * 1000);
    
    // Update OTP record with session token
    const { error: updateError } = await supabase
      .from('otp_codes')
      .update({ 
        session_token: sessionToken,
        expires_at: sessionExpiresAt.toISOString()
      })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error("Failed to create session:", updateError);
      throw new Error("Failed to create session");
    }

    console.log("OTP verified successfully:", { identifier, sessionToken });

    return new Response(
      JSON.stringify({ 
        success: true, 
        sessionToken,
        [method]: identifier 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in verify-otp function:", error);
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
