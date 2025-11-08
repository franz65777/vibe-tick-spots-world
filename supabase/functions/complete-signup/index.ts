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

    // Initialize Supabase Admin Client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify session token in database
    const { data: sessionRecord, error: sessionError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !sessionRecord) {
      return new Response(
        JSON.stringify({ error: "Sessione non valida o scaduta" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check session expiration
    if (new Date(sessionRecord.expires_at) < new Date()) {
      await supabase.from('otp_codes').delete().eq('id', sessionRecord.id);
      return new Response(
        JSON.stringify({ error: "Sessione scaduta" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Note: We cannot reliably check if phone/email exists beforehand
    // because listUsers() has pagination limits. Instead, we'll handle
    // the error when creating the user.

    // Check username uniqueness (case-insensitive)
    const { data: existingUsername, error: usernameCheckError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username.toLowerCase())
      .maybeSingle();

    if (usernameCheckError) {
      console.error("Error checking username:", usernameCheckError);
      return new Response(
        JSON.stringify({ error: "Errore controllo username" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (existingUsername) {
      return new Response(
        JSON.stringify({ error: "Username già in uso" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

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
      const code = (authError as any).code || '';
      const msg = (authError as any).message || '';
      const status = (authError as any).status || 400;

      if (code === 'phone_exists' || /phone/i.test(msg)) {
        return new Response(
          JSON.stringify({ error: "Numero di telefono già registrato" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (code === 'email_exists' || /email/i.test(msg)) {
        return new Response(
          JSON.stringify({ error: "Email già registrata" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ error: msg || 'Errore durante la creazione utente' }),
        { status: status >= 400 && status < 600 ? status : 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
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
      
      // Check if it's a unique constraint violation (username already exists)
      if (profileError.code === '23505') {
        return new Response(
          JSON.stringify({ error: "Username già in uso" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      
      throw new Error(profileError.message);
    }

    // Clear session from database
    await supabase.from('otp_codes').delete().eq('id', sessionRecord.id);

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
