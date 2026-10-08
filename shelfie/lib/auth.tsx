"use client";
import { createContext, useContext, useState, useEffect } from "react";

export type AuthUser = {
  role: "customer" | "shopkeeper";
  phone?: string;    // Used for customer
  shopId?: string;   // Used for shopkeeper
};

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  isHydrated: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("shelfie_mock_auth");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch (e) {}
    }
    setIsHydrated(true);
  }, []);

  const login = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem("shelfie_mock_auth", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("shelfie_mock_auth");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isHydrated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
