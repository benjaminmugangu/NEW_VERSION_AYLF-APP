// src/contexts/AuthContext.tsx
"use client";

import type { Role, User } from "@/lib/types";
import React, { createContext, useState, useEffect, ReactNode, useCallback } from "react";
import { ROLES } from "@/lib/constants";
import { mockUsers, mockSites, mockSmallGroups } from "@/lib/mockData"; 

interface AuthContextType {
  currentUser: User | null;
  login: (email: string, password?: string) => void; // Password optional for now
  logout: () => void;
  isLoading: boolean;
  updateUserProfile: (updatedData: Partial<User>) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        if (Object.values(ROLES).includes(parsedUser.role)) {
           setCurrentUser(parsedUser);
        } else {
          localStorage.removeItem("currentUser");
        }
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem("currentUser");
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((email: string, password?: string) => {
    setIsLoading(true);
    // This is a temporary, simplified login for front-end development.
    // It bypasses password validation and logs in a default admin user.
    const userToLogin: User = {
      id: 'user-admin-001',
      name: 'Admin User',
      email: email,
      role: ROLES.NATIONAL_COORDINATOR, // Default to highest privilege for development
      status: 'active',
      siteId: undefined,
      smallGroupId: undefined,
    };

    setCurrentUser(userToLogin);
    localStorage.setItem("currentUser", JSON.stringify(userToLogin));
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setIsLoading(true);
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    setIsLoading(false);
  }, []);

  const updateUserProfile = useCallback((updatedData: Partial<User>) => {
    if (currentUser) {
      const newUser = { ...currentUser, ...updatedData };
      if (updatedData.role && updatedData.role !== currentUser.role) {
        console.warn("Role cannot be changed from profile edit. Ignoring role update.");
        newUser.role = currentUser.role;
      }
      setCurrentUser(newUser);
      localStorage.setItem("currentUser", JSON.stringify(newUser));

      const userIndex = mockUsers.findIndex(u => u.id === currentUser.id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...newUser };
      }
    }
  }, [currentUser]);

  return (
    <AuthContext.Provider value={{ currentUser, login, logout, isLoading, updateUserProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

