import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, CustomerProfile, UserRole } from '../types';
import { authService } from '../services/authService';
import { auth, onAuthStateChanged, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: (role?: UserRole) => Promise<User>;
  loginCustomer: (email?: string, password?: string) => Promise<User>;
  loginPriest: (email?: string, password?: string) => Promise<User>;
  loginAdmin: (email?: string, password?: string) => Promise<User>;
  registerCustomer: (data: { name: string; email: string; phone: string; password?: string }) => Promise<User>;
  registerPriest: (data: {
    name: string;
    email: string;
    phone: string;
    city: string;
    languages: string[];
    experience?: number;
    experienceYears?: number;
    title?: string;
    tradition?: string;
    password?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  updateProfile: (updated: Partial<CustomerProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userRef = doc(db, 'users', fbUser.uid);
          const userDoc = await getDoc(userRef);
          if (userDoc.exists()) {
            const data = userDoc.data();
            const u: User = {
              id: fbUser.uid,
              name: data.name || fbUser.displayName || 'Devotee',
              email: data.email || fbUser.email || '',
              phone: data.phone || fbUser.phoneNumber || '',
              role: (data.role as UserRole) || 'customer',
              avatarUrl: data.avatarUrl || fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
              city: data.city || '',
              createdAt: data.createdAt || new Date().toISOString()
            };
            setCurrentUser(u);
            authService.setCurrentUser(u);
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
        }
      } else {
        // If logged out from Firebase, clear current user
        if (!authService.getCurrentUser()) {
          setCurrentUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async (role: UserRole = 'customer') => {
    setIsLoading(true);
    try {
      const user = await authService.loginWithGoogle(role);
      setCurrentUser(user);
      return user;
    } finally {
      setIsLoading(false);
    }
  };

  const loginCustomer = async (email?: string, password?: string) => {
    const user = await authService.loginCustomer(email, password);
    setCurrentUser(user);
    return user;
  };

  const loginPriest = async (email?: string, password?: string) => {
    const user = await authService.loginPriest(email, password);
    setCurrentUser(user);
    return user;
  };

  const loginAdmin = async (email?: string, password?: string) => {
    const user = await authService.loginAdmin(email, password);
    setCurrentUser(user);
    return user;
  };

  const registerCustomer = async (data: { name: string; email: string; phone: string; password?: string }) => {
    const user = await authService.registerCustomer(data);
    setCurrentUser(user);
    return user;
  };

  const registerPriest = async (data: {
    name: string;
    email: string;
    phone: string;
    city: string;
    languages: string[];
    experience?: number;
    experienceYears?: number;
    title?: string;
    tradition?: string;
    password?: string;
  }) => {
    const user = await authService.registerPriest(data);
    setCurrentUser(user);
    return user;
  };

  const logout = async () => {
    await authService.logout();
    setCurrentUser(null);
  };

  const updateProfile = async (updated: Partial<CustomerProfile>) => {
    const updatedUser = await authService.updateProfile(updated);
    setCurrentUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        role: currentUser?.role || null,
        isAuthenticated: !!currentUser,
        isLoading,
        loginWithGoogle,
        loginCustomer,
        loginPriest,
        loginAdmin,
        registerCustomer,
        registerPriest,
        logout,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
