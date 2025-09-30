import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'daily' | 'weekly' | 'seasonal' | 'city_specific';
  category?: string;
  city?: string;
  start_date: string;
  end_date: string;
  reward_points: number;
  reward_badge_id?: string;
  target_count: number;
  target_action: string;
  is_active: boolean;
}

export interface ChallengeProgress {
  id: string;
  challenge_id: string;
  current_count: number;
  completed: boolean;
  completed_at?: string;
  challenge?: Challenge;
}

export const useChallenges = (city?: string) => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<(Challenge & { progress?: ChallengeProgress })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    fetchChallenges();
  }, [user, city]);

  const fetchChallenges = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch active challenges
      let query = supabase
        .from('challenges')
        .select('*')
        .eq('is_active', true)
        .lte('start_date', new Date().toISOString())
        .gte('end_date', new Date().toISOString());

      if (city) {
        query = query.or(`city.is.null,city.eq.${city}`);
      }

      const { data: challengesData, error: challengesError } = await query;

      if (challengesError) throw challengesError;

      if (!challengesData) {
        setChallenges([]);
        return;
      }

      // Type cast the data to match our Challenge interface
      const typedChallenges = challengesData.map(c => ({
        ...c,
        challenge_type: c.challenge_type as 'daily' | 'weekly' | 'seasonal' | 'city_specific'
      }));

      // Fetch user progress for these challenges
      const { data: progressData, error: progressError } = await supabase
        .from('user_challenge_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('challenge_id', typedChallenges.map(c => c.id));

      if (progressError) throw progressError;

      // Merge challenges with progress
      const challengesWithProgress = typedChallenges.map(challenge => {
        const progress = progressData?.find(p => p.challenge_id === challenge.id);
        return {
          ...challenge,
          progress: progress ? {
            id: progress.id,
            challenge_id: progress.challenge_id,
            current_count: progress.current_count || 0,
            completed: progress.completed || false,
            completed_at: progress.completed_at
          } : undefined
        };
      });

      setChallenges(challengesWithProgress);
    } catch (err: any) {
      console.error('Error fetching challenges:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const trackChallengeAction = async (actionType: string, actionCity?: string) => {
    if (!user) return;

    try {
      await supabase.rpc('check_challenge_completion', {
        target_user_id: user.id,
        action_type: actionType,
        action_city: actionCity
      });

      // Refresh challenges to get updated progress
      await fetchChallenges();
    } catch (err) {
      console.error('Error tracking challenge action:', err);
    }
  };

  return {
    challenges,
    loading,
    error,
    refetch: fetchChallenges,
    trackChallengeAction
  };
};
