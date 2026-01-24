import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  business_description?: string;
  website_url?: string;
  phone_number?: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  created_at: string;
  updated_at: string;
}

export const useBusinessProfile = () => {
  const { user } = useAuth();

  const { data: businessProfile, isLoading: loading, error } = useQuery({
    queryKey: ['businessProfile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as BusinessProfile | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,  // Cache for 5 minutes
    gcTime: 10 * 60 * 1000,   // Keep in memory for 10 minutes
  });

  const hasValidBusinessAccount = businessProfile?.verification_status === 'verified';

  return {
    businessProfile,
    hasValidBusinessAccount,
    loading,
    error: error?.message || null
  };
};
