import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { retentionAnalyticsService } from '@/services/retentionAnalyticsService';
import { useEffect, lazy, Suspense } from 'react';
import './App.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { supabase } from '@/integrations/supabase/client';
import i18n from '@/i18n';

// Lazy load pages for better initial load performance
import Index from '@/pages/Index';
const ExplorePage = lazy(() => import('@/components/ExplorePage'));
const ProfilePage = lazy(() => import('@/components/ProfilePage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const MessagesPage = lazy(() => import('@/pages/MessagesPage'));
const PostPage = lazy(() => import('@/pages/PostPage'));
const FeedPage = lazy(() => import('@/pages/FeedPage'));
const ActivityFeedPage = lazy(() => import('@/pages/ActivityFeedPage'));
const UserProfilePage = lazy(() => import('@/components/UserProfilePage'));
const AddLocationPage = lazy(() => import('@/components/AddLocationPage'));
const DiscoverPage = lazy(() => import('@/pages/DiscoverPage'));
const LeaderboardPage = lazy(() => import('@/pages/LeaderboardPage'));
const ShareLocationPage = lazy(() => import('@/pages/ShareLocationPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const BusinessClaimPage = lazy(() => import('@/pages/BusinessClaimPage'));
const BusinessDashboardPage = lazy(() => import('@/pages/BusinessDashboardPage'));
const SubscriptionPage = lazy(() => import('@/pages/SubscriptionPage'));
const AdminAnalyticsPage = lazy(() => import('@/pages/AdminAnalyticsPage'));
const AdminBusinessRequestsPage = lazy(() => import('@/pages/AdminBusinessRequestsPage'));
const BusinessOverviewPageV2 = lazy(() => import('@/pages/business/BusinessOverviewPageV2'));
const BusinessAnalyticsPage = lazy(() => import('@/pages/business/BusinessAnalyticsPage'));
const BusinessProfilePage = lazy(() => import('@/pages/business/BusinessProfilePage'));
const BusinessAddPage = lazy(() => import('@/pages/business/BusinessAddPage'));
const BusinessFeedPage = lazy(() => import('@/pages/business/BusinessFeedPage'));
const BusinessMessagesPage = lazy(() => import('@/pages/business/BusinessMessagesPage'));
const BusinessNotificationsPage = lazy(() => import('@/pages/business/BusinessNotificationsPage'));

// Auth pages - not lazy loaded as they're needed immediately
import SigninStart from '@/pages/auth/SigninStart';
import SignupStart from '@/pages/auth/SignupStart';
import SignupVerify from '@/pages/auth/SignupVerify';
import SignupProfile from '@/pages/auth/SignupProfile';
import SignupDetails from '@/pages/auth/SignupDetails';
import SignupPassword from '@/pages/auth/SignupPassword';

// Initialize analytics cleanup service for data privacy compliance
import '@/services/analyticsCleanupService';

// Loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

function AppContent() {
  console.log('🔄 AppContent rendering...');
  const { user } = useAuth();
  console.log('👤 User state:', user?.email || 'No user');
  console.log('🔍 Current pathname:', window.location.pathname);

  useEffect(() => {
    if (user) {
      retentionAnalyticsService.trackSessionStart();
    }
  }, [user]);

  useEffect(() => {
    const loadLang = async () => {
      if (!user?.id) return;
      const { data } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .single();
      const lang = data?.language || 'en';
      localStorage.setItem('userLanguage', lang);
      localStorage.setItem('i18nextLng', lang);
      try { i18n.changeLanguage(lang); } catch {}
    };
    loadLang();
  }, [user?.id]);

  return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<SigninStart />} />
          <Route path="/signup/start" element={<SignupStart />} />
          <Route path="/signup/verify" element={<SignupVerify />} />
          <Route path="/signup/profile" element={<SignupProfile />} />
          <Route path="/signup/details" element={<SignupDetails />} />
          <Route path="/signup/password" element={<SignupPassword />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />

        <Route
          element={
            <ProtectedRoute>
              <AuthenticatedLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Index />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/add" element={<AddLocationPage />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/activity" element={<ActivityFeedPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/post/:postId" element={<PostPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/business" element={<BusinessOverviewPageV2 />} />
          <Route path="/business/analytics" element={<BusinessAnalyticsPage />} />
          <Route path="/business/add" element={<BusinessAddPage />} />
          <Route path="/business/feed" element={<BusinessFeedPage />} />
          <Route path="/business/profile" element={<BusinessProfilePage />} />
          <Route path="/business/notifications" element={<BusinessNotificationsPage />} />
          <Route path="/business/messages" element={<BusinessMessagesPage />} />
          <Route path="/business-dashboard" element={<BusinessDashboardPage />} />
          <Route path="/business-claim" element={<BusinessClaimPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/profile/:userId" element={<UserProfilePage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/business-requests" element={<AdminBusinessRequestsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/share-location" element={<ShareLocationPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

function App() {
  console.log('🎯 App component rendering...');
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
          <Toaster />
          <Sonner />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
