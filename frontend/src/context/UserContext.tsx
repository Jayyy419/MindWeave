import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getProfile } from "@/services/api";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  isAdmin?: boolean;
};

function normalizeAuthUser(value: unknown): AuthUser | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  if (
    typeof candidate.id !== "string" ||
    typeof candidate.email !== "string" ||
    typeof candidate.username !== "string"
  ) {
    return null;
  }

  return {
    id: candidate.id,
    email: candidate.email,
    username: candidate.username,
    isAdmin: candidate.isAdmin === true,
  };
}

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "mindweave-auth-token";
const USER_KEY = "mindweave-auth-user";

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;

    try {
      const parsed = normalizeAuthUser(JSON.parse(raw));
      if (!parsed) {
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  });

  useEffect(() => {
    if (!token || !user) {
      return;
    }

    getProfile()
      .then((profile) => {
        const nextUser: AuthUser = {
          id: profile.id,
          email: profile.email,
          username: profile.username,
          isAdmin: profile.isAdmin === true,
        };

        setUser((current) => {
          if (
            current &&
            current.id === nextUser.id &&
            current.email === nextUser.email &&
            current.username === nextUser.username &&
            current.isAdmin === nextUser.isAdmin
          ) {
            return current;
          }

          localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
          return nextUser;
        });
      })
      .catch(() => {
        // Ignore refresh failures and keep the existing session snapshot.
      });
  }, [token, user]);

  function setSession(nextToken: string, nextUser: AuthUser) {
    const normalizedNextUser: AuthUser = {
      id: nextUser.id,
      email: nextUser.email,
      username: nextUser.username,
      isAdmin: nextUser.isAdmin === true,
    };

    setToken(nextToken);
    setUser(normalizedNextUser);
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(normalizedNextUser));
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token && user),
      setSession,
      logout,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useUser(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
