import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentAuthUser, authSignIn, authSignUp, authSignOut, authConfirmSignUp } from '@/lib/auth';

interface User {
  userId: string;
  username: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<any>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const currentUser = await getCurrentAuthUser();
      if (currentUser && currentUser.userId) {
        setUser({
          userId: currentUser.userId,
          username: currentUser.username,
        });
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error: any) {
      // Shouldn't happen since getCurrentAuthUser catches errors
      console.error('Unexpected error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authSignIn({ email, password });
      if (result.isSignedIn) {
        // Refresh auth status to get user details
        await checkAuthStatus();
      }
    } catch (error: any) {
      // If user is already signed in, refresh auth status instead of throwing error
      if (error.message?.includes('already a signed in user') || error.message?.includes('already signed in')) {
        await checkAuthStatus();
        return;
      }
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const result = await authSignUp({ email, password, name });
      return result;
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const confirmSignUp = async (email: string, code: string) => {
    try {
      await authConfirmSignUp(email, code);
    } catch (error) {
      console.error('Confirm sign up error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await authSignOut();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        signIn,
        signUp,
        confirmSignUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};


