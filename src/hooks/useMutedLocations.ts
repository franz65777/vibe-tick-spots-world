import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useMutedLocations = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  const { data: mutedLocations, isLoading } = useQuery({
    queryKey: ['muted-locations', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_muted_locations')
        .select(`
          id,
          location_id,
          created_at,
          locations (
            id,
            name,
            address,
            city,
            category
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });

  const muteLocation = useMutation({
    mutationFn: async (locationId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('user_muted_locations')
        .insert({ user_id: userId, location_id: locationId });

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
