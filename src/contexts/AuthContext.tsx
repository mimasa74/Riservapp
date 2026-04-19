import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../firebase';
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  User
} from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  login: async () => {},
  logout: async () => {}
});

export const useAuth = () => useContext(AuthContext);

const ADMIN_EMAILS = ['michele.bruni@gmail.com'];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Anon users restano loggati (servono per le rules isAuthenticated()).
    // Google users non-admin vengono disconnessi: il direttivo usa solo michele.bruni@.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && !currentUser.isAnonymous && !ADMIN_EMAILS.includes(currentUser.email ?? '')) {
        await signOut(auth);
        return;
      }
      setUser(currentUser);
      setIsAdmin(!!currentUser && ADMIN_EMAILS.includes(currentUser.email ?? ''));
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Errore login:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Errore logout:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
