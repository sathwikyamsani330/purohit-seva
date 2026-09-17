import { User, CustomerProfile, UserRole, Customer } from '../types';
import {
  auth,
  db,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  firebaseSignOut,
  handleFirestoreError,
  OperationType
} from '../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';

const AUTH_USER_KEY = 'purohit_seva_current_user';

export const authService = {
  getAllCustomers: async (): Promise<Customer[]> => {
    try {
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('role', '==', 'customer'));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Devotee',
            email: data.email || '',
            phone: data.phone || '',
            avatarUrl: data.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
            city: data.city || '',
            gotra: data.gotra || '',
            createdAt: data.createdAt || new Date().toISOString()
          };
        });
      }
      return [];
    } catch (err) {
      console.warn('Could not query customers from Firestore:', err);
      return [];
    }
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
          phone: data.phone || fbUser.phoneNumber || '',
          role: (data.role as UserRole) || role,
          avatarUrl: data.avatarUrl || fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          city: data.city || '',
          createdAt: data.createdAt || new Date().toISOString()
        };
      } else {
        appUser = {
          id: uid,
          name: fbUser.displayName || 'Devotee',
          email: fbUser.email || '',
          phone: fbUser.phoneNumber || '',
          role,
          avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          city: '',
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

  // Customer Firebase Authentication
  loginCustomer: async (email?: string, password?: string): Promise<User> => {
    if (!email || !password) {
      throw new Error('Please enter both your email address and password.');
    }

    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const fbUser = credential.user;
    const userRef = doc(db, 'users', fbUser.uid);

    let userDoc;
    try {
      userDoc = await getDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
    }

    let user: User;
    if (userDoc && userDoc.exists()) {
      const data = userDoc.data();
      user = {
        id: fbUser.uid,
        name: data.name || fbUser.displayName || 'Devotee',
        email: data.email || fbUser.email || email.trim(),
        phone: data.phone || fbUser.phoneNumber || '',
        role: (data.role as UserRole) || 'customer',
        avatarUrl: data.avatarUrl || fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        city: data.city || '',
        createdAt: data.createdAt || new Date().toISOString()
      };
    } else {
      user = {
        id: fbUser.uid,
        name: fbUser.displayName || 'Devotee',
        email: fbUser.email || email.trim(),
        phone: fbUser.phoneNumber || '',
        role: 'customer',
        avatarUrl: fbUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        city: '',
        createdAt: new Date().toISOString()
      };
      try {
        await setDoc(userRef, user);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
      }
    }

    authService.setCurrentUser(user);
    return user;
  },

  // Priest / Acharya Firebase Authentication
  loginPriest: async (email?: string, password?: string): Promise<User> => {
    if (!email || !password) {
      throw new Error('Please enter both your registered Acharya email address and password.');
    }

    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const fbUser = credential.user;
    const userRef = doc(db, 'users', fbUser.uid);

    let userDoc;
    try {
      userDoc = await getDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${fbUser.uid}`);
    }

    if (!userDoc || !userDoc.exists()) {
      await firebaseSignOut(auth);
      throw new Error('No priest profile found for this account. Please register as an Acharya or contact support.');
    }

    const data = userDoc.data();
    if (data.role !== 'priest' && data.role !== 'admin') {
      await firebaseSignOut(auth);
      throw new Error('Unauthorized: This account does not have Acharya/Priest portal privileges.');
    }

    const user: User = {
      id: fbUser.uid,
      name: data.name || fbUser.displayName || 'Acharya',
      email: data.email || fbUser.email || email.trim(),
      phone: data.phone || fbUser.phoneNumber || '',
      role: data.role as UserRole,
      avatarUrl: data.avatarUrl || fbUser.photoURL || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
      city: data.city || '',
      createdAt: data.createdAt || new Date().toISOString()
    };

    authService.setCurrentUser(user);
    return user;
  },

  // Administrator Firebase Authentication with Verified Permissions
  loginAdmin: async (email?: string, password?: string): Promise<User> => {
    if (!email || !password) {
      throw new Error('Please enter administrator credentials.');
    }

    const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
    const fbUser = credential.user;

    // Check custom claims
    const tokenResult = await fbUser.getIdTokenResult();
    const hasAdminClaim = Boolean(tokenResult.claims.admin);

    // Check administrative record in Firestore
    let isDbAdmin = false;
    try {
      const adminDocRef = doc(db, 'admins', fbUser.uid);
      const adminDocSnap = await getDoc(adminDocRef);
      if (adminDocSnap.exists()) {
        isDbAdmin = true;
      } else {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists() && userDocSnap.data().role === 'admin') {
          isDbAdmin = true;
        }
      }
    } catch (err) {
      console.warn('Error checking admin permissions in Firestore:', err);
    }

    if (!hasAdminClaim && !isDbAdmin) {
      await firebaseSignOut(auth);
      throw new Error('Unauthorized: This account does not have verified platform administrator privileges.');
    }

    const user: User = {
      id: fbUser.uid,
      name: fbUser.displayName || 'Platform Administrator',
      email: fbUser.email || email.trim(),
      phone: fbUser.phoneNumber || '',
      role: 'admin',
      city: 'Central Office',
      createdAt: fbUser.metadata.creationTime || new Date().toISOString()
    };

    authService.setCurrentUser(user);
    return user;
  },

  registerCustomer: async (data: { name: string; email: string; phone: string; password?: string }): Promise<User> => {
    if (!data.email || !data.password) {
      throw new Error('Email address and password are required for registration.');
    }

    const credential = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
    const fbUser = credential.user;

    const user: User = {
      id: fbUser.uid,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      role: 'customer',
      city: 'Bengaluru',
      createdAt: new Date().toISOString()
    };

    const userRef = doc(db, 'users', fbUser.uid);
    try {
      await setDoc(userRef, user);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
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
    if (!data.email || !data.password) {
      throw new Error('Email address and password are required for Acharya registration.');
    }

    const credential = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
    const fbUser = credential.user;

    const user: User = {
      id: fbUser.uid,
      name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      role: 'priest',
      city: data.city.trim(),
      createdAt: new Date().toISOString()
    };

    const userRef = doc(db, 'users', fbUser.uid);
    try {
      await setDoc(userRef, {
        ...user,
        title: data.title || 'Vedic Purohit',
        tradition: data.tradition || 'Smartha',
        experienceYears: data.experienceYears || data.experience || 5,
        languages: data.languages,
        isVerified: false,
        verificationStatus: 'pending'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${fbUser.uid}`);
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
