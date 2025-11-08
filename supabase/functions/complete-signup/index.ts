import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompleteSignupRequest {
  sessionToken: string;
  fullName: string;
  username: string;
  dateOfBirth: string;
  gender: string;
  password: string;
  email?: string;
  phone?: string;
}

// In-memory session storage (shared with verify-otp)
const otpStore = new Map<string, { code: string; expires: number }>();

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      sessionToken, 
      fullName, 
      username, 
      dateOfBirth, 
      gender, 
      password,
      email,
      phone 
    }: CompleteSignupRequest = await req.json();

    // Verify session token
    const session = otpStore.get(`session:${sessionToken}`);
    if (!session) {
      return new Response(
        JSON.stringify({ error: "Sessione non valida o scaduta" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (Date.now() > session.expires) {
      otpStore.delete(`session:${sessionToken}`);
      return new Response(
        JSON.stringify({ error: "Sessione scaduta" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Create user account
    const signUpData: any = {
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: fullName,
        date_of_birth: dateOfBirth,
        gender,
      }
    };

    if (email) {
      signUpData.email = email;
    }
    if (phone) {
      signUpData.phone = phone;
    }

    const { data: authData, error: authError } = await supabase.auth.admin.createUser(signUpData);

    if (authError) {
      console.error("Auth error:", authError);
      throw new Error(authError.message);
    }

    if (!authData.user) {
      throw new Error("Failed to create user");
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        username: username.toLowerCase(),
      });

    if (profileError) {
      console.error("Profile error:", profileError);
      // Rollback user creation
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(profileError.message);
    }

    // Clear session
    otpStore.delete(`session:${sessionToken}`);

    console.log("User created successfully:", { userId: authData.user.id, username });

    // Return session for auto-login
    return new Response(
      JSON.stringify({ 
        success: true,
        user: authData.user,
        session: authData.session
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in complete-signup function:", error);
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
