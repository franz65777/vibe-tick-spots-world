import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, MapPin } from 'lucide-react';

const WelcomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-8">
        <div className="w-full max-w-md space-y-8 text-center">
          {/* Logo with animation */}
          <div className="space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative">
                <h1 className="text-5xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent relative">
                  SP
                  <span className="relative inline-block">
                    O
                    <MapPin className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 text-orange-500 fill-orange-500 opacity-80" />
                  </span>
                  TT
                </h1>
              </div>
            </div>
            
            <h2 className="text-lg font-medium bg-gradient-to-r from-blue-400 via-purple-500 to-red-400 bg-clip-text text-transparent">
              Spott it. Share it. Experience it.
            </h2>
          </div>

          {/* Welcome text */}
          <div className="space-y-4">
            <p className="text-lg text-gray-700 leading-relaxed">
              Discover amazing{' '}
              <span className="font-bold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent">
                places
              </span>{' '}
              through your friends' favourite{' '}
              <span className="font-bold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent">
                spots
              </span>
            </p>
          </div>

          {/* Action buttons */}
          <div className="space-y-4 pt-8">
            <Button
              onClick={() => navigate('/auth')}
              className="w-full h-12 bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 hover:from-blue-900 hover:via-blue-700 hover:to-blue-500 text-white font-medium"
            >
              <LogIn className="w-5 h-5 mr-2" />
              LOG IN
            </Button>

            <Button
              onClick={() => navigate('/auth')}
              variant="outline"
              className="w-full h-12 border-2 border-blue-200 text-blue-700 hover:bg-blue-50 font-medium"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              SIGN UP
            </Button>
          </div>

          {/* Divider */}
          <div className="flex items-center py-4">
            <div className="flex-1 border-t border-gray-200"></div>
            <span className="px-4 text-xs text-gray-500 font-medium tracking-wide">
              OR CONTINUE WITH
            </span>
            <div className="flex-1 border-t border-gray-200"></div>
          </div>

          {/* Social login buttons */}
          <div className="flex justify-center space-x-6">
            <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            </button>
            <button className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#000000" d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            </button>
          </div>

          {/* Terms */}
          <div className="pt-8 text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline font-medium">
              Terms of Service
            </a>{' '}
            &{' '}
            <a href="#" className="text-blue-600 hover:underline font-medium">
              Privacy Policy
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;
