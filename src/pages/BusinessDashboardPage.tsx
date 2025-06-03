
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import BusinessDashboard from '@/components/business/BusinessDashboard';

const BusinessDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Mock business data - in a real app, this would come from Supabase
  const businessData = {
    businessName: "Blue Bottle Coffee Co.",
    locationName: "Blue Bottle Coffee - Mission District",
    savedByCount: 1247,
    totalPosts: 89,
    engagementRate: 12.3,
    claimedLocation: {
      id: 'place-4',
      name: 'Blue Bottle Coffee',
      category: 'cafe'
    }
  };

  if (!user) {
    navigate('/auth');
    return null;
  }

  return <BusinessDashboard businessData={businessData} />;
};

export default BusinessDashboardPage;
