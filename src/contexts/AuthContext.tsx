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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAdmin(!!currentUser);
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
