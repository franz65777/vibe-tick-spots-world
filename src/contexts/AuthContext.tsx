import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
    console.log('AuthProvider: Setting up auth state listener...');
    
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
            console.log('AuthProvider: Token expired or expiring soon, refreshing...');
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('AuthProvider: Error refreshing expired token:', error);
              await supabase.auth.signOut();
            } else {
              console.log('AuthProvider: Token refreshed successfully');
              setSession(data.session);
              setUser(data.session?.user ?? null);
            }
          }
        }
      } catch (error) {
        console.error('AuthProvider: Error checking token expiry:', error);
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, session?.user?.email);
        
        if (event === 'TOKEN_REFRESHED') {
          console.log('AuthProvider: Token refreshed successfully');
        }
        
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        
        // If user just signed in, ensure profile exists with timeout
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: User signed in, ensuring profile exists...');
          try {
            await Promise.race([
              ensureProfileExists(session.user),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Profile creation timeout')), 5000)
              )
            ]);
          } catch (error) {
            console.warn('AuthProvider: Profile creation failed or timed out, continuing anyway:', error);
          }
        }
        
        console.log('AuthProvider: Setting loading to false');
        setLoading(false);
      }
    );

    // Check for existing session and validate token
    console.log('AuthProvider: Checking for existing session...');
    Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 3000)
      )
    ]).then(async ({ data: { session } }: any) => {
      console.log('AuthProvider: Existing session:', session?.user?.email);
      
      // Check if token is expired
      if (session?.expires_at) {
        const expiryTime = session.expires_at * 1000;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        // If token is expired or expiring within 5 minutes, refresh it
        if (expiryTime - now < fiveMinutes) {
          console.log('AuthProvider: Token expired or expiring soon, forcing refresh...');
          try {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('AuthProvider: Error refreshing expired session, forcing logout:', error);
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setLoading(false);
              return;
            } else {
              console.log('AuthProvider: Token refreshed successfully');
              setSession(data.session);
              setUser(data.session?.user ?? null);
            }
          } catch (err) {
            console.error('AuthProvider: Exception during refresh, forcing logout:', err);
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
      console.warn('AuthProvider: Session check failed or timed out, clearing session:', error);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Check token on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('AuthProvider: Tab visible, checking token...');
        checkAndRefreshToken();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Set up automatic token refresh every 50 minutes (before 60min expiry)
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('AuthProvider: Periodic token refresh...');
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('AuthProvider: Error refreshing session, signing out:', error);
          await supabase.auth.signOut();
        }
      }
    }, 50 * 60 * 1000); // Every 50 minutes

    // Check token immediately on mount
    checkAndRefreshToken();

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
      clearInterval(refreshInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const ensureProfileExists = async (user: User) => {
    try {
      console.log('AuthProvider: Checking if profile exists for user:', user.id);
      
      // Check if profile already exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // Error other than "not found"
        console.error('AuthProvider: Error checking profile:', fetchError);
        return;
      }

      if (!existingProfile) {
        console.log('AuthProvider: Profile does not exist, creating...');
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
          console.error('AuthProvider: Error creating profile:', error);
          throw error;
        } else {
          console.log('AuthProvider: Profile created successfully');
        }
      } else {
        console.log('AuthProvider: Profile already exists');
      }
    } catch (error) {
      console.error('AuthProvider: Error checking/creating profile:', error);
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

  const signIn = async (email: string, password: string) => {
    // SECURITY FIX: Only allow email-based sign in to prevent user enumeration
    // Users must sign in with their email address, not username
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password,
    });

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
      console.warn('Failed to track auth attempt:', analyticsError);
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

  console.log('AuthProvider: Rendering with loading:', loading, 'user:', user?.email);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
