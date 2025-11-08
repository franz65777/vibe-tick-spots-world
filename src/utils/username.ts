import { supabase } from "@/integrations/supabase/client";

export async function checkUsernameAvailability(rawUsername: string): Promise<{ available: boolean; error?: string }>{
  const username = rawUsername.trim().toLowerCase();
  if (!username) return { available: false, error: "Username vuoto" };

  try {
    const { count, error } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .ilike('username', username);


    if (error) {
      return { available: false, error: error.message };
    }

    return { available: (count ?? 0) === 0 };
  } catch (e: any) {
    return { available: false, error: e?.message || 'Errore sconosciuto' };
  }
}
