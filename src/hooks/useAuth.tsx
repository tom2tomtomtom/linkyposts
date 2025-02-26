
import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          throw error;
        }

        console.log('Initial session check:', { hasSession: !!currentSession });
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state change:', { event: _event, hasSession: !!session });
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (!user?.id) {
      console.log('No user found during sign out');
      navigate('/');
      return;
    }

    try {
      const userId = user.id;

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;

      try {
        const { error: tokenError } = await supabase
          .from('linkedin_auth_tokens')
          .delete()
          .eq('user_id', userId);

        if (tokenError) {
          console.error('Error clearing LinkedIn tokens:', tokenError);
        }
      } catch (tokenError) {
        console.error('Error during token cleanup:', tokenError);
      }

      setSession(null);
      setUser(null);
      
      navigate('/');
      toast.success('Successfully signed out');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Error signing out: ' + error.message);
      navigate('/');
    }
  };

  const value = {
    user,
    session,
    isLoading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
