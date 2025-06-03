import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, fullName?: string, username?: string) => Promise<{ error: any }>;
  signIn: (emailOrUsername: string, password: string) => Promise<{ error: any }>;
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
        setSession(session);
        setUser(session?.user ?? null);
        
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

    return () => {
      console.log('AuthProvider: Cleaning up auth subscription');
      subscription.unsubscribe();
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
            posts_count: 0
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

  const signIn = async (emailOrUsername: string, password: string) => {
    // First try to sign in with email
    let { error } = await supabase.auth.signInWithPassword({
      email: emailOrUsername,
      password,
    });

    // If that fails and it looks like a username (no @ symbol), try to find the email by username
    if (error && !emailOrUsername.includes('@')) {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', emailOrUsername)
          .single();

        if (profile?.email) {
          const { error: emailSignInError } = await supabase.auth.signInWithPassword({
            email: profile.email,
            password,
          });
          error = emailSignInError;
        }
      } catch (profileError) {
        // If we can't find the username, keep the original error
        console.log('Could not find user by username:', profileError);
      }
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
