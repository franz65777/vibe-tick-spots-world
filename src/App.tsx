
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import BusinessDashboardPage from "./pages/BusinessDashboardPage";
import BusinessSubscription from "./pages/BusinessSubscription";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import WelcomePage from "./components/WelcomePage";
import ExplorePage from "./components/ExplorePage";
import AddLocationPage from "./components/AddLocationPage";
import ProfilePage from "./components/ProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  console.log('App component rendering...');
  
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/welcome" element={<WelcomePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/business-subscription" element={<BusinessSubscription />} />
              <Route path="/" element={<Index />} />
              <Route path="/explore" element={
                <ProtectedRoute>
                  <ExplorePage />
                </ProtectedRoute>
              } />
              <Route path="/add" element={
                <ProtectedRoute>
                  <AddLocationPage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/business" element={
                <ProtectedRoute>
                  <BusinessDashboardPage />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
