
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
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
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
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
                      <Route path="/business" element={<BusinessDashboardPage />} />
                      <Route path="/subscription" element={<SubscriptionPage />} />
                      <Route path="/profile/:userId" element={<UserProfilePage />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AuthenticatedLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        <Toaster />
        <Sonner />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
