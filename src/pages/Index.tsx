
import { useAuth } from '@/contexts/AuthContext';
import WelcomePage from '@/components/WelcomePage';
import HomePage from '@/components/HomePage';

const Index = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show welcome page if user is not authenticated
  if (!user) {
    return <WelcomePage />;
  }

  // Show main app if user is authenticated
  return <HomePage />;
};

export default Index;
