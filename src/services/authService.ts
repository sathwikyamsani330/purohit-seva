import { User, CustomerProfile, UserRole, Customer } from '../types';
import { MOCK_CUSTOMERS, MOCK_PRIESTS } from '../data/mockData';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  firebaseSignOut,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

const AUTH_USER_KEY = 'purohit_seva_current_user';

export const authService = {
  getAllCustomers: async (): Promise<Customer[]> => {
    return MOCK_CUSTOMERS.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      avatarUrl: c.avatarUrl,
      city: c.city,
      gotra: c.gotra || 'Kashyapa Gotra',
      createdAt: c.createdAt
    }));
  },

  getCurrentUser: (): User | null => {
    const saved = localStorage.getItem(AUTH_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  },

  setCurrentUser: (user: User | null): void => {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  },

  // Firebase Google Popup Login
  loginWithGoogle: async (role: UserRole = 'customer'): Promise<User> => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;
      const uid = fbUser.uid;
      const userRef = doc(db, 'users', uid);

      let userDoc;
      try {
        userDoc = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }

      let appUser: User;
      if (userDoc && userDoc.exists()) {
        const data = userDoc.data();
        appUser = {
          id: uid,
          name: data.name || fbUser.displayName || 'Devotee',
          email: data.email || fbUser.email || '',
          phone: data.phone || fbUser.phoneNumber || '+91 98450 11223',
          role: (data.role as UserRole) || role,
          avatarUrl: data.avatarUrl || fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          city: data.city || 'Bengaluru',
          createdAt: data.createdAt || new Date().toISOString()
        };
      } else {
        appUser = {
          id: uid,
          name: fbUser.displayName || 'Devotee',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '+91 98450 11223',
          role,
          avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          city: 'Bengaluru',
          createdAt: new Date().toISOString()
        };

        try {
          await setDoc(userRef, appUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
        }
      }

      authService.setCurrentUser(appUser);
      return appUser;
    } catch (error) {
      console.error('Google Sign-In Error:', error);
      throw error;
    }
  },

  loginCustomer: async (email?: string, _password?: string): Promise<User> => {
    await new Promise((res) => setTimeout(res, 200));
    const customer = (email ? MOCK_CUSTOMERS.find(c => c.email.toLowerCase() === email.toLowerCase()) : null) || {
      id: 'cust-1',
      name: 'Suresh Nair',
      email: email || 'suresh.nair@example.com',
      phone: '+91 98451 22334',
      role: 'customer' as UserRole,
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      city: 'Bengaluru',
      createdAt: '2026-01-15T10:00:00.000Z'
    };

    const user: User = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      role: 'customer',
      avatarUrl: customer.avatarUrl,
      city: customer.city,
      createdAt: customer.createdAt
    };

    authService.setCurrentUser(user);
    return user;
  },

  loginPriest: async (email?: string, _password?: string): Promise<User> => {
    await new Promise((res) => setTimeout(res, 200));
    const priest = (email ? MOCK_PRIESTS.find(p => p.email.toLowerCase() === email.toLowerCase()) : null) || MOCK_PRIESTS[0];

    const user: User = {
      id: priest.id,
      name: priest.name,
      email: priest.email,
      phone: priest.phone || '+91 98450 12345',
      role: 'priest',
      avatarUrl: priest.avatarUrl,
      city: priest.city,
      createdAt: '2025-10-10T10:00:00.000Z'
    };

    authService.setCurrentUser(user);
    return user;
  },

  loginAdmin: async (email?: string, password?: string): Promise<User> => {
    await new Promise((res) => setTimeout(res, 200));
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    // Verify authorized admin credentials
    const isAuthorizedAdmin =
      !cleanEmail ||
      cleanEmail === 'admin@purohitseva.in' ||
      cleanEmail === 'sathwikyamsani330@gmail.com' ||
      cleanEmail.startsWith('admin@');

    if (!isAuthorizedAdmin) {
      throw new Error('Unauthorized: This email does not have platform administrator privileges.');
    }

    if (cleanPass && cleanPass.length < 4 && cleanPass !== 'admin') {
      throw new Error('Invalid administrative passkey.');
    }

    const user: User = {
      id: 'adm-001',
      name: 'Purohit Seva Admin',
      email: cleanEmail || 'admin@purohitseva.in',
      phone: '+91 80000 11223',
      role: 'admin',
      city: 'Bengaluru Head Office',
      createdAt: '2025-01-01T00:00:00.000Z'
    };

    authService.setCurrentUser(user);
    return user;
  },

  registerCustomer: async (data: { name: string; email: string; phone: string; password?: string }): Promise<User> => {
    const user: User = {
      id: `cust-${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: 'customer',
      city: 'Bengaluru',
      createdAt: new Date().toISOString()
    };

    // Store in Firestore if auth user exists
    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { ...user, id: auth.currentUser.uid });
        user.id = auth.currentUser.uid;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}`);
      }
    }

    authService.setCurrentUser(user);
    return user;
  },

  registerPriest: async (data: {
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
  }): Promise<User> => {
    const user: User = {
      id: `pr-${Date.now()}`,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: 'priest',
      city: data.city,
      createdAt: new Date().toISOString()
    };

    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await setDoc(userRef, { ...user, id: auth.currentUser.uid });
        user.id = auth.currentUser.uid;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${auth.currentUser.uid}`);
      }
    }

    authService.setCurrentUser(user);
    return user;
  },

  updateProfile: async (updated: Partial<CustomerProfile>): Promise<CustomerProfile> => {
    const current = authService.getCurrentUser();
    if (!current) throw new Error('No user logged in');
    const newUser = { ...current, ...updated };

    if (auth.currentUser) {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, updated);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      }
    }

    authService.setCurrentUser(newUser);
    return newUser as CustomerProfile;
  },

  logout: async (): Promise<void> => {
    try {
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } catch (e) {
      console.warn('Firebase signout warning:', e);
    }
    authService.setCurrentUser(null);
  }
};
