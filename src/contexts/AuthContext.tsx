import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName?: string, username?: string) => Promise<{ error: any }>;
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

    // Check for existing session with timeout
    console.log('AuthProvider: Checking for existing session...');
    Promise.race([
      supabase.auth.getSession(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Session check timeout')), 3000)
      )
    ]).then(({ data: { session } }: any) => {
      console.log('AuthProvider: Existing session:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((error) => {
      console.warn('AuthProvider: Session check failed or timed out:', error);
      setLoading(false);
    });

    // Set up automatic token refresh every 45 minutes
    const refreshInterval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log('AuthProvider: Refreshing session token...');
        const { error } = await supabase.auth.refreshSession();
        if (error) {
          console.error('AuthProvider: Error refreshing session, signing out:', error);
          await supabase.auth.signOut();
        }
      }
    }, 45 * 60 * 1000);

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
      clearInterval(refreshInterval);
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
            places_visited: 0
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

  const signUp = async (email: string, password: string, fullName?: string, username?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
          username: username,
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
