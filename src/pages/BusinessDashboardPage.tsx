
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BusinessDashboard from '@/components/business/BusinessDashboard';
import { supabase } from '@/integrations/supabase/client';

const BusinessDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [businessData, setBusinessData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    fetchBusinessData();
  }, [user]);

  const fetchBusinessData = async () => {
    if (!user) return;

    try {
      // Fetch claimed location
      const { data: location, error: locationError } = await supabase
        .from('locations')
        .select('id, name, category, address')
        .eq('claimed_by', user.id)
        .maybeSingle();

      if (locationError) {
        console.error('Error fetching claimed location:', locationError);
        setLoading(false);
        return;
      }

      if (!location) {
        console.log('No claimed location found');
        setBusinessData(null);
        setLoading(false);
        return;
      }

      // Fetch saved count
      const { count: savedCount, error: savedError } = await supabase
        .from('user_saved_locations')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', location.id);

      // Fetch posts count
      const { count: postsCount, error: postsError } = await supabase
        .from('posts')
        .select('*', { count: 'exact', head: true })
        .eq('location_id', location.id);

      // Fetch likes count from posts
      const { data: posts } = await supabase
        .from('posts')
        .select('likes_count')
        .eq('location_id', location.id);

      const totalLikes = posts?.reduce((sum, post) => sum + (post.likes_count || 0), 0) || 0;
      const engagementRate = postsCount && postsCount > 0 
        ? ((totalLikes / postsCount) * 100).toFixed(1)
        : 0;

      setBusinessData({
        businessName: location.name,
        locationName: location.name,
        savedByCount: savedCount || 0,
        totalPosts: postsCount || 0,
        engagementRate: parseFloat(engagementRate as string),
        claimedLocation: {
          id: location.id,
          name: location.name,
          category: location.category
        }
      });
    } catch (error) {
      console.error('Error fetching business data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!businessData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Business Claimed</h2>
        <p className="text-gray-600 text-center max-w-md">
          You haven't claimed any business locations yet. Find a location on the map and click "Claim this business" to get started.
        </p>
      </div>
    );
  }

  return <BusinessDashboard businessData={businessData} />;
};

export default BusinessDashboardPage;
