import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.9";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckType = 'email' | 'phone' | 'username';

interface CheckAvailabilityRequest {
  type: CheckType;
  value: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, value }: CheckAvailabilityRequest = await req.json();
    const normalized = value?.trim();
    if (!normalized) {
      return new Response(JSON.stringify({ error: 'Valore mancante' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (type === 'username') {
      const username = normalized.toLowerCase();
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .ilike('username', username);

      if (error) {
        console.error('Username check error:', error);
        return new Response(JSON.stringify({ error: 'Errore controllo username' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      return new Response(
        JSON.stringify({ exists: (count ?? 0) > 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (type === 'email') {
      console.log('Checking email availability:', normalized);
      let exists = false;
      try {
        // List all users and check manually (most reliable approach)
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) {
          console.error('listUsers error:', error);
          throw error;
        }
        
        const users = (data as any)?.users || [];
        console.log(`Found ${users.length} total users`);
        
        // Check if email exists (case-insensitive)
        exists = users.some((u: any) => {
          const userEmail = (u.email || '').toLowerCase();
          const match = userEmail === normalized.toLowerCase();
          if (match) {
            console.log('Email match found:', userEmail);
          }
          return match;
        });
        
        console.log(`Email ${normalized} exists:`, exists);
      } catch (err) {
        console.error('Error checking email:', err);
        throw err;
      }

      return new Response(
        JSON.stringify({ exists }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (type === 'phone') {
      console.log('Checking phone availability:', normalized);
      let exists = false;
      try {
        // List all users and check manually
        const { data, error } = await supabase.auth.admin.listUsers();
        if (error) {
          console.error('listUsers error:', error);
          throw error;
        }
        
        const users = (data as any)?.users || [];
        console.log(`Found ${users.length} total users`);
        
        // Normalize phone by stripping non-digits for comparison
        const digits = normalized.replace(/\D/g, '');
        exists = users.some((u: any) => {
          const userPhone = (u.phone || '').replace(/\D/g, '');
          const match = userPhone === digits;
          if (match) {
            console.log('Phone match found:', u.phone);
          }
          return match;
        });
        
        console.log(`Phone ${normalized} exists:`, exists);
      } catch (err) {
        console.error('Error checking phone:', err);
        throw err;
      }

      return new Response(
        JSON.stringify({ exists }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    return new Response(JSON.stringify({ error: 'Tipo non supportato' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (error: any) {
    console.error('Error in check-availability function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
};

serve(handler);
