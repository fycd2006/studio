"use client"

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type Role = 'admin' | 'crew' | null;

interface AuthContextType {
  role: Role;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedRole = localStorage.getItem("studio_role") as Role;
    if (savedRole) {
      setRole(savedRole);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!role && pathname !== "/login") {
        router.push("/login");
      } else if (role && pathname === "/login") {
        router.push("/");
      }
    }
  }, [role, isLoading, pathname, router]);

  const login = (username: string, password: string): boolean => {
    let identifiedRole: Role = null;

    if (username === "admin" && password === "ntutfycdcamp") {
      identifiedRole = "admin";
    } else if (username === "crew" && password === "cdcamp") {
      identifiedRole = "crew";
    }

    if (identifiedRole) {
      setRole(identifiedRole);
      localStorage.setItem("studio_role", identifiedRole);
      return true;
    }
    return false;
  };

  const logout = () => {
    setRole(null);
    localStorage.removeItem("studio_role");
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ role, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
