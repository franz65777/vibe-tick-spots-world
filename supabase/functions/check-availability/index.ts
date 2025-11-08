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
      // Try to use listUsers with email filter (supported by GoTrue Admin API)
      // Fallback: scan first page if filter not supported (sufficient for small projects)
      let exists = false;
      try {
        // @ts-ignore - some versions accept filter params
        const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, email: normalized });
        const users = (data as any)?.users || [];
        exists = users.some((u: any) => (u.email || '').toLowerCase() === normalized.toLowerCase());
      } catch (err) {
        console.warn('listUsers email filter unsupported, falling back:', err);
        const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
        const users = (data as any)?.users || [];
        exists = users.some((u: any) => (u.email || '').toLowerCase() === normalized.toLowerCase());
      }

      return new Response(
        JSON.stringify({ exists }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (type === 'phone') {
      let exists = false;
      try {
        // Normalize phone by stripping non-digits for comparison
        const digits = normalized.replace(/\D/g, '');
        // @ts-ignore - some versions accept filter params
        const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1, phone: normalized });
        const users = (data as any)?.users || [];
        exists = users.some((u: any) => (u.phone || '').replace(/\D/g, '') === digits);
        if (!exists) {
          // Fallback scan first page
          const { data: data2 } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
          const users2 = (data2 as any)?.users || [];
          exists = users2.some((u: any) => (u.phone || '').replace(/\D/g, '') === digits);
        }
      } catch (err) {
        console.warn('listUsers phone filter unsupported, falling back:', err);
        const { data } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
        const users = (data as any)?.users || [];
        const digits = normalized.replace(/\D/g, '');
        exists = users.some((u: any) => (u.phone || '').replace(/\D/g, '') === digits);
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
