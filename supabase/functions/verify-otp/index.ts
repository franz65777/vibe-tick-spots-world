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

// In-memory OTP storage (shared with send-otp in production via Redis/DB)
const otpStore = new Map<string, { code: string; expires: number }>();

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

    // Check OTP
    const stored = otpStore.get(identifier);
    if (!stored) {
      return new Response(
        JSON.stringify({ error: "Codice non trovato o scaduto" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(identifier);
      return new Response(
        JSON.stringify({ error: "Codice scaduto" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (stored.code !== code) {
      return new Response(
        JSON.stringify({ error: "Codice non valido" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // OTP verified - remove from store
    otpStore.delete(identifier);

    // Create a temporary session token (expires in 30 min)
    const sessionToken = crypto.randomUUID();
    const sessionExpires = Date.now() + 30 * 60 * 1000;
    
    // Store session temporarily (in production, use database)
    otpStore.set(`session:${sessionToken}`, { 
      code: method === 'email' ? email! : phone!, 
      expires: sessionExpires 
    });

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

export { otpStore };
