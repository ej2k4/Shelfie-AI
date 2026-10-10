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

    const onStorageChange = () => {
      const current = localStorage.getItem("shelfie_mock_auth");
      if (current) {
        try { setUser(JSON.parse(current)); } catch { setUser(null); }
      } else {
        setUser(null);
      }
    };
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  const login = (u: AuthUser) => {
    setUser(u);
    localStorage.setItem("shelfie_mock_auth", JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("shelfie_mock_auth");
    // Also clear cookie if set
    if (typeof document !== "undefined") {
      document.cookie = "shelfie_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    }
    // Async call to server logout
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isHydrated }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
