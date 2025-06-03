
import React, { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MapPin, LogIn, UserPlus } from 'lucide-react';

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
                <h1 className="text-5xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent">
                  SPOTT
                </h1>
                <MapPin className="absolute -top-2 right-2 w-7 h-7 text-orange-500" />
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

          {/* Social login placeholder */}
          <div className="flex justify-center space-x-6">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
              <span className="text-xs text-gray-400">G</span>
            </div>
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center border border-gray-200">
              <span className="text-xs text-gray-400">🍎</span>
            </div>
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
