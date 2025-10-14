import { supabase } from '@/integrations/supabase/client';

export interface LocationRanking {
  id: string;
  location_id: string;
  score: number;
  source: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get the ranking score for a location (1-10)
 */
export async function getLocationRanking(locationId: string): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from('location_rankings')
      .select('score')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching location ranking:', error);
      return null;
    }

    return data?.score || null;
  } catch (error) {
    console.error('Error in getLocationRanking:', error);
    return null;
  }
}
