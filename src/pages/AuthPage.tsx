
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, MapPin, ArrowLeft, Building } from 'lucide-react';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login';
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [accountType, setAccountType] = useState<'free' | 'business'>('free');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'signup') {
      setIsLogin(false);
    } else if (mode === 'login') {
      setIsLogin(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(emailOrUsername, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Welcome back!');
          navigate('/');
        }
      } else {
        // Validation for signup
        if (password !== confirmPassword) {
          toast.error('Passwords do not match');
          setLoading(false);
          return;
        }
        
        if (password.length < 6) {
          toast.error('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }

        if (accountType === 'business' && (!businessName || !businessType)) {
          toast.error('Please fill in all business information');
          setLoading(false);
          return;
        }

        const { error } = await signUp(email, password, fullName, username);
        if (error) {
          toast.error(error.message);
        } else {
          if (accountType === 'business') {
            toast.success('Business account created! Redirecting to subscription setup...');
            // Redirect to business subscription page
            navigate(`/business-subscription?from=signup&email=${encodeURIComponent(email)}`);
          } else {
            toast.success('Account created! Please check your email to verify your account.');
            navigate('/');
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header with back button */}
      <div className="flex items-center p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          Back
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo and title */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <h1 className="text-4xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent flex items-baseline">
                  SPOTT
                  <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
                </h1>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h2>
            <p className="text-gray-600">
              {isLogin 
                ? 'Sign in to discover amazing places' 
                : 'Join SPOTT to start discovering amazing places'
              }
            </p>
          </div>

          {/* Account type selector for signup */}
          {!isLogin && (
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700">Account Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAccountType('free')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    accountType === 'free'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <MapPin className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Free User</div>
                  <div className="text-xs text-gray-500">Discover & share places</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('business')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    accountType === 'business'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Building className="w-6 h-6 mx-auto mb-2" />
                  <div className="text-sm font-medium">Business</div>
                  <div className="text-xs text-gray-500">60 days free trial</div>
                </button>
              </div>
              {accountType === 'business' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-700">
                    🎉 <strong>60-day free trial!</strong> Full access to all business features, then €29.99/month or downgrade to free.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <>
                <div>
                  <Label htmlFor="fullName" className="text-sm font-medium text-gray-700">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <Label htmlFor="username" className="text-sm font-medium text-gray-700">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required={!isLogin}
                    className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Choose a username"
                  />
                </div>

                {accountType === 'business' && (
                  <>
                    <div>
                      <Label htmlFor="businessName" className="text-sm font-medium text-gray-700">
                        Business Name
                      </Label>
                      <Input
                        id="businessName"
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        required={accountType === 'business'}
                        className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                        placeholder="Enter your business name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="businessType" className="text-sm font-medium text-gray-700">
                        Business Type
                      </Label>
                      <select
                        id="businessType"
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        required={accountType === 'business'}
                        className="mt-1 h-12 w-full border border-gray-300 rounded-md px-3 py-2 focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select business type</option>
                        <option value="restaurant">Restaurant</option>
                        <option value="hotel">Hotel</option>
                        <option value="cafe">Cafe</option>
                        <option value="bar">Bar</option>
                        <option value="shop">Shop</option>
                        <option value="attraction">Attraction</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required={!isLogin}
                    className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>
              </>
            )}

            {isLogin && (
              <div>
                <Label htmlFor="emailOrUsername" className="text-sm font-medium text-gray-700">
                  Email or Username
                </Label>
                <Input
                  id="emailOrUsername"
                  type="text"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  required={isLogin}
                  className="mt-1 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your email or username"
                />
              </div>
            )}

            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                Password
              </Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {!isLogin && (
              <div>
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirm Password
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required={!isLogin}
                    className="h-12 pr-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 hover:from-blue-900 hover:via-blue-700 hover:to-blue-500 text-white font-medium"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          {/* Toggle between login and signup */}
          <div className="text-center">
            <p className="text-gray-600">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  navigate(`/auth?mode=${!isLogin ? 'login' : 'signup'}`);
                }}
                className="ml-2 font-medium text-blue-600 hover:text-blue-500"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Terms and Privacy */}
          <div className="text-center text-xs text-gray-500">
            By continuing, you agree to our{' '}
            <button 
              onClick={() => navigate('/terms')}
              className="text-blue-600 hover:underline"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button 
              onClick={() => navigate('/privacy')}
              className="text-blue-600 hover:underline"
            >
              Privacy Policy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
