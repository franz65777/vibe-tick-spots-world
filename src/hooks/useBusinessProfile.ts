import { useState, useEffect } from 'react';
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
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusinessProfile = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('business_profiles')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setBusinessProfile(data);
      } catch (err) {
        console.error('Error fetching business profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to load business profile');
      } finally {
        setLoading(false);
      }
    };

    fetchBusinessProfile();
  }, [user]);

  const hasValidBusinessAccount = businessProfile?.verification_status === 'verified';

  return {
    businessProfile,
    hasValidBusinessAccount,
    loading,
    error
  };
};
