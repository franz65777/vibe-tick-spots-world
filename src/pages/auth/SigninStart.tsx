import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';

const SigninStart = () => {
  const [identifier, setIdentifier] = useState(''); // email or phone
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Accedi - Spott';
  }, []);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await signIn(identifier, password);
      if (error) {
        toast.error(error.message === 'Invalid login credentials' 
          ? 'Email/telefono o password non validi' 
          : error.message);
      } else {
        toast.success('Bentornato!');
        navigate('/');
      }
    } catch (err) {
      toast.error('Errore durante l\'accesso');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Theme toggle in header */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide px-6 py-8 overscroll-contain [-webkit-overflow-scrolling:touch]">
        <div className="w-full max-w-md mx-auto space-y-8 pt-12">
          {/* Logo */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="relative">
                <h1 className="text-4xl font-semibold bg-gradient-to-br from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent flex items-baseline">
                  SPOTT
                  <MapPin className="w-3 h-3 text-blue-600 fill-blue-600 ml-1" />
                </h1>
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">
              Bentornato
            </h2>
            <p className="text-muted-foreground">
              Accedi per continuare a scoprire luoghi incredibili
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Email o Telefono
              </label>
              <Input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className="h-12 bg-background text-foreground"
                placeholder="email@esempio.com o +39 123 456 7890"
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground block mb-2">
                Password
              </label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-10 bg-background text-foreground"
                  placeholder="Inserisci la tua password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !identifier || !password}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg"
            >
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </Button>
          </form>

          {/* Sign up link */}
          <div className="text-center text-sm text-muted-foreground">
            Non hai un account?{' '}
            <button
              onClick={() => navigate('/signup/start')}
              className="text-primary font-medium hover:opacity-80"
            >
              Registrati
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SigninStart;
