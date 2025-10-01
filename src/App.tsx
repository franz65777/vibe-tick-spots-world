import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import AuthPage from '@/pages/AuthPage';
import Index from '@/pages/Index';
import BusinessDashboardPage from '@/pages/BusinessDashboardPage';
import SubscriptionPage from '@/pages/SubscriptionPage';
import TermsPage from '@/pages/TermsPage';
import PrivacyPage from '@/pages/PrivacyPage';
import NotFound from '@/pages/NotFound';
import UserProfilePage from '@/components/UserProfilePage';
import ExplorePage from '@/components/ExplorePage';
import ProfilePage from '@/components/ProfilePage';
import AddLocationPage from '@/components/AddLocationPage';
import FeedPage from '@/pages/FeedPage';
import ActivityFeedPage from '@/pages/ActivityFeedPage';
import LeaderboardPage from '@/pages/LeaderboardPage';
import AdminAnalyticsPage from '@/pages/AdminAnalyticsPage';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { retentionAnalyticsService } from '@/services/retentionAnalyticsService';
import { useEffect } from 'react';
import './App.css';

// Initialize analytics cleanup service for data privacy compliance
import '@/services/analyticsCleanupService';

const queryClient = new QueryClient();

function AppContent() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      retentionAnalyticsService.trackSessionStart();
    }
  }, [user]);

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AuthenticatedLayout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/add" element={<AddLocationPage />} />
                <Route path="/feed" element={<FeedPage />} />
                <Route path="/activity" element={<ActivityFeedPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/business" element={<BusinessDashboardPage />} />
                <Route path="/subscription" element={<SubscriptionPage />} />
                <Route path="/profile/:userId" element={<UserProfilePage />} />
                <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthenticatedLayout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
        <Toaster />
        <Sonner />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
