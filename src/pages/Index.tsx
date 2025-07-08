
import { useAuth } from '@/contexts/AuthContext';
import WelcomePage from '@/components/WelcomePage';
import SimpleHomePage from '@/components/SimpleHomePage';
import AuthenticatedLayout from '@/components/AuthenticatedLayout';

const Index = () => {
  const { user, loading } = useAuth();
  
  console.log('Index page: loading =', loading, 'user =', user?.email);
  
  if (loading) {
    console.log('Index page: Still loading, showing spinner');
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
    console.log('Index page: No user, showing welcome page');
    return <WelcomePage />;
  }

  console.log('Index page: User authenticated, showing home page');
  // Show main app if user is authenticated
  return (
    <AuthenticatedLayout>
      <SimpleHomePage />
    </AuthenticatedLayout>
  );
};

export default Index;
