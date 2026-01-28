import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Development-only logging to reduce console spam in production
const isDev = import.meta.env.DEV;
const devLog = (...args: any[]) => isDev && console.log(...args);
const devWarn = (...args: any[]) => isDev && console.warn(...args);
const devError = (...args: any[]) => console.error(...args); // Always log errors

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName?: string, username?: string, language?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    devLog('AuthProvider: Setting up auth state listener...');
    
    // Function to check and refresh token if needed
    const checkAndRefreshToken = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // Check if token is expired or will expire soon (within 5 minutes)
        const expiresAt = session.expires_at;
        if (expiresAt) {
          const expiryTime = expiresAt * 1000; // Convert to milliseconds
          const now = Date.now();
          const fiveMinutes = 5 * 60 * 1000;

          if (expiryTime - now < fiveMinutes) {
            devLog('AuthProvider: Token expired or expiring soon, refreshing...');
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              devError('AuthProvider: Error refreshing expired token:', error);
              await supabase.auth.signOut();
            } else {
              devLog('AuthProvider: Token refreshed successfully');
              setSession(data.session);
              setUser(data.session?.user ?? null);
            }
          }
        }
      } catch (error) {
        devError('AuthProvider: Error checking token expiry:', error);
      }
    };

    // Set up auth state listener (sync only to avoid deadlocks)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        devLog('AuthProvider: Auth state changed:', event, session?.user?.email);
        
        if (event === 'TOKEN_REFRESHED') {
          devLog('AuthProvider: Token refreshed successfully');
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        // If user just signed in, defer profile creation to avoid async work in callback
        if (event === 'SIGNED_IN' && session?.user) {
          devLog('AuthProvider: User signed in, scheduling profile ensure...');
          setTimeout(() => {
            ensureProfileExists(session.user!).catch((error) => {
              devWarn('AuthProvider: Profile ensure failed (non-blocking):', error);
            });
          }, 0);
        }
        
        devLog('AuthProvider: Setting loading to false');
        setLoading(false);
      }
    );

    // Check for existing session and validate token
    devLog('AuthProvider: Checking for existing session...');
    Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 3000)
      )
    ]).then(async ({ data: { session } }: any) => {
      devLog('AuthProvider: Existing session:', session?.user?.email);
      
      // Check if token is expired
      if (session?.expires_at) {
        const expiryTime = session.expires_at * 1000;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        // If token is expired or expiring within 5 minutes, refresh it
        if (expiryTime - now < fiveMinutes) {
          devLog('AuthProvider: Token expired or expiring soon, forcing refresh...');
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              devError('AuthProvider: Error refreshing expired session, forcing logout:', error);
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setLoading(false);
              return;
            } else {
              devLog('AuthProvider: Token refreshed successfully');
              setSession(data.session);
              setUser(data.session?.user ?? null);
            }
          } catch (err) {
            devError('AuthProvider: Exception during refresh, forcing logout:', err);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setLoading(false);
            return;
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
      
      setLoading(false);
    }).catch((error) => {
      devWarn('AuthProvider: Session check failed or timed out, clearing session:', error);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Check token on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        devLog('AuthProvider: Tab visible, checking token...');
        checkAndRefreshToken();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up automatic token refresh every 50 minutes (before 60min expiry)
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        devLog('AuthProvider: Periodic token refresh...');
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          devError('AuthProvider: Error refreshing session, signing out:', error);
          await supabase.auth.signOut();
        }
      }
    }, 50 * 60 * 1000); // Every 50 minutes

    // Check token immediately on mount
    checkAndRefreshToken();

    return () => {
      devLog('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const ensureProfileExists = async (user: User) => {
    try {
      devLog('AuthProvider: Checking if profile exists for user:', user.id);
      
      // Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error other than "not found"
        devError('AuthProvider: Error checking profile:', fetchError);
        return;
      }

      if (!existingProfile) {
        devLog('AuthProvider: Profile does not exist, creating...');
        // Create profile if it doesn't exist
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            username: user.user_metadata?.username || `user_${user.id.substring(0, 8)}`,
            full_name: user.user_metadata?.full_name,
            avatar_url: user.user_metadata?.avatar_url,
            posts_count: 0,
            // Initialize security-relevant fields
            follower_count: 0,
            following_count: 0,
            cities_visited: 0,
            places_visited: 0,
            language: user.user_metadata?.language || 'en'
          });

        if (error) {
          devError('AuthProvider: Error creating profile:', error);
          throw error;
        } else {
          devLog('AuthProvider: Profile created successfully');
        }
      } else {
        devLog('AuthProvider: Profile already exists');
      }
    } catch (error) {
      devError('AuthProvider: Error checking/creating profile:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, username?: string, language: string = 'en') => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          username: username,
          language,
        }
      }
    });
    return { error };
  };

  const signIn = async (identifier: string, password: string) => {
    // Support email, phone, and username sign in
    let loginIdentifier = identifier;
    
    devLog('SignIn attempt with identifier:', identifier);
    
    // Detect if identifier is email, phone, or username
    const isEmail = identifier.includes('@');
    const isPhone = identifier.startsWith('+') || /^\d+$/.test(identifier);
    
    devLog('isEmail:', isEmail, 'isPhone:', isPhone);
    
    // If it's not email or phone, treat it as username and look up the email
    if (!isEmail && !isPhone) {
      devLog('Looking up username using security definer function...');
      try {
        const { data: email, error: rpcError } = await supabase
          .rpc('get_email_from_username', { _username: identifier });
        
        devLog('RPC result - email:', email, 'error:', rpcError);
        
        if (rpcError || !email) {
          devError('Username not found:', rpcError);
          return { error: { message: 'Invalid login credentials' } };
        }
        
        loginIdentifier = email;
        devLog('Found email for username:', loginIdentifier);
      } catch (err) {
        devError('Exception during username lookup:', err);
        return { error: { message: 'Invalid login credentials' } };
      }
    }
    
    console.log('Attempting auth with:', loginIdentifier);
    const { error } = await supabase.auth.signInWithPassword(
      isEmail || (!isEmail && !isPhone)
        ? { email: loginIdentifier, password }
        : { phone: loginIdentifier, password }
    );
    
    console.log('Auth result error:', error);

    // Track authentication attempts for rate limiting (anonymized)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      await supabase.from('user_analytics').insert({
        user_id: currentUser?.id || null, // Allow null for failed auth attempts
        event_type: 'auth_attempt',
        event_data: { 
          success: !error,
          timestamp: new Date().toISOString() 
        },
        page_url: window.location.href
      });
    } catch (analyticsError) {
      // Don't block sign in if analytics fails
      devWarn('Failed to track auth attempt:', analyticsError);
    }

    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    signUp,
    signIn,
    signOut,
    loading,
  };

  devLog('AuthProvider: Rendering with loading:', loading, 'user:', user?.email);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
