import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface SuperUser {
  id: string;
  user_id: string;
  status: 'active' | 'suspended' | 'elite';
  points: number;
  level: number;
  weekly_contributions: number;
  total_contributions: number;
  current_streak?: number;
  longest_streak?: number;
  last_activity_date?: string;
  created_at: string;
  updated_at: string;
}

interface UseSuperUserReturn {
  superUser: SuperUser | null;
  loading: boolean;
  error: string | null;
  refreshSuperUser: () => void;
  isElite: boolean;
  levelProgress: number;
}

export const useSuperUser = (): UseSuperUserReturn => {
  const { user } = useAuth();
  const [superUser, setSuperUser] = useState<SuperUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuperUser = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('super_users')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching super user:', fetchError);
        setError(fetchError.message);
        return;
      }

      setSuperUser(data ? {
        ...data,
        status: data.status as 'active' | 'suspended' | 'elite'
      } : null);
    } catch (err: any) {
      console.error('Error in fetchSuperUser:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperUser();
  }, [user]);

  const refreshSuperUser = () => {
    fetchSuperUser();
  };

  const isElite = superUser?.status === 'elite' || (superUser?.level || 0) >= 10;
  
  // Calculate level progress correctly - points needed for next level
  const currentLevelPoints = superUser ? (superUser.points % 100) : 0;
  const levelProgress = currentLevelPoints;

  return {
    superUser,
    loading,
    error,
    refreshSuperUser,
    isElite,
    levelProgress
  };
};