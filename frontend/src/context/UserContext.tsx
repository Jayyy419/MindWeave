import React, { createContext, useContext, useEffect, useState } from "react";

interface UserContextType {
  anonymousId: string;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Generates a UUID v4-like string for anonymous user identification.
 */
function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Provides the anonymous user ID to the app.
 * On first load, generates a UUID and stores it in localStorage.
 * Subsequent loads use the stored ID.
 */
export function UserProvider({ children }: { children: React.ReactNode }) {
  const [anonymousId] = useState<string>(() => {
    const stored = localStorage.getItem("mindweave-anonymous-id");
    if (stored) return stored;
    const newId = generateId();
    localStorage.setItem("mindweave-anonymous-id", newId);
    return newId;
  });

  return (
    <UserContext.Provider value={{ anonymousId }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access the anonymous user ID.
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
