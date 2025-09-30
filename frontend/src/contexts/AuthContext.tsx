/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, userApi, tokenManager, User, ApiResponse, LoginResponse } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

import type { AuthContextType, RegisterData } from '@/contexts/auth-types';

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const isAuthenticated = !!user && user.status === 'approved';

  const refreshToken = useCallback(async (): Promise<void> => {
    try {
      const response = await authApi.refreshToken();
      if (response.success && response.data) {
        tokenManager.setToken(response.data.token);
        setUser(response.data.user);
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      tokenManager.removeToken();
      setUser(null);
      throw error;
    }
  }, []);

  // Initialize authentication state on app load
  useEffect(() => {
    const initializeAuth = async () => {
      const token = tokenManager.getToken();
      
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Try to get user profile with existing token
        const response = await userApi.getProfile();
        if (response.success && response.data) {
          setUser(response.data);
        } else {
          // Token might be invalid, try to refresh
          await refreshToken();
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Clear invalid token
        tokenManager.removeToken();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [refreshToken]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response: ApiResponse<LoginResponse> = await authApi.login(email, password);
      
      if (response.success && response.data) {
        const { user: userData, token } = response.data;
        
        // Store token and user data
        tokenManager.setToken(token);
        setUser(userData);
        
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.username}!`,
        });
        
        return true;
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error: unknown) {
      console.error('Login failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Invalid credentials. Please try again.';
      
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const response = await authApi.register(userData);
      
      if (response.success) {
        toast({
          title: "Registration Successful",
          description: "Your account has been created and is pending admin approval. You'll receive an email once approved.",
        });
        
        return true;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error: unknown) {
      console.error('Registration failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authApi.logout();

      // Clear local state
      tokenManager.removeToken();
      setUser(null);

      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error('Logout failed:', error);

      // Even if server logout fails, clear local state
      tokenManager.removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const refreshUser = async (): Promise<void> => {
    try {
      const response = await userApi.getProfile();
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  const updateUser = async (userData: Partial<User>): Promise<boolean> => {
    try {
      const response = await userApi.updateProfile(userData);
      
      if (response.success && response.data) {
        setUser(response.data);
        
        toast({
          title: "Profile Updated",
          description: "Your profile has been updated successfully.",
        });
        
        return true;
      } else {
        throw new Error(response.message || 'Update failed');
      }
    } catch (error: unknown) {
      console.error('Profile update failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    }
  };

  // Set up automatic token refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(async () => {
      try {
        await refreshToken();
      } catch (error) {
        console.error('Auto token refresh failed:', error);
        // Force logout if refresh fails
        await logout();
      }
    }, 23 * 60 * 1000); // Refresh every 23 minutes (tokens expire in 24 hours)

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated, refreshToken, logout]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
