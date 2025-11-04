import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useMutedLocations = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: mutedLocations, isLoading } = useQuery({
    queryKey: ['muted-locations', userId],
    queryFn: async () => {
      if (!userId) return [];

      // 1) Fetch muted rows (no join to avoid FK requirement)
      const { data, error } = await supabase
        .from('user_muted_locations')
        .select('id, location_id, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const muted = data || [];

      // 2) Fetch locations in one shot
      const ids = muted.map((m: any) => m.location_id).filter(Boolean);
      if (ids.length === 0) return muted;

      const { data: locations, error: locErr } = await supabase
        .from('locations')
        .select('id, name, address, city, category, latitude, longitude')
        .in('id', ids);

      if (locErr) throw locErr;
      const locMap = new Map((locations || []).map((l: any) => [l.id, l]));

      return muted.map((m: any) => ({ ...m, locations: locMap.get(m.location_id) || null }));
    },
    enabled: !!userId,
  });

  const muteLocation = useMutation({
    mutationFn: async (locationId: string) => {
      if (!userId) throw new Error('User not authenticated');

      // Avoid RLS issues from UPSERT (which requires UPDATE policy)
      // If already muted, no-op to prevent duplicates
      if (mutedLocations?.some((m: any) => m.location_id === locationId)) return;

      const { error } = await supabase
        .from('user_muted_locations')
        .insert([{ user_id: userId, location_id: locationId }]);

      if (error) {
        // Ignore unique constraint violation (already muted)
        if ((error as any).code === '23505' || error.message?.toLowerCase().includes('duplicate key')) {
          return;
        }
        throw error;
      }

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-locations', userId] });
      toast.success('Location muted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to mute location');
    },
  });

  const unmuteLocation = useMutation({
    mutationFn: async (locationId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_muted_locations')
        .delete()
        .eq('user_id', userId)
        .eq('location_id', locationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-locations', userId] });
      toast.success('Location unmuted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to unmute location');
    },
  });

  return {
    mutedLocations,
    isLoading,
    muteLocation: muteLocation.mutate,
    unmuteLocation: unmuteLocation.mutate,
    isMuting: muteLocation.isPending || unmuteLocation.isPending,
  };
};
