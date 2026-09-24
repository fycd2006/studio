"use client"

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

type Role = 'admin' | 'crew' | null;

interface AuthContextType {
  role: Role;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
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

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      if (data.role) {
        setRole(data.role);
        localStorage.setItem("studio_role", data.role);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignore network error on logout
    }
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
