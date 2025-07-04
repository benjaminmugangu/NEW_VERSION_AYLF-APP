// src/services/auth.service.ts
'use client';

import { mockUsers, mockSites, mockSmallGroups } from '@/lib/mockData';
import type { User, Site, SmallGroup, LoginCredentials, ServiceResponse } from '@/lib/types';

// This service simulates an authentication API.
// In the future, this will be replaced with actual calls to Supabase.

const authService = {
  login: async (credentials: LoginCredentials): Promise<ServiceResponse<User>> => {
    console.log('Attempting login with:', credentials);
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

    const user = mockUsers.find((u: User) => u.email === credentials.email);

    if (user) {
      console.log('Login successful for:', user.name);
      // In a real app, you might also store a token here
      localStorage.setItem("currentUser", JSON.stringify(user));
      return { success: true, data: user };
    } else {
      console.log('Login failed: user not found');
      return { success: false, error: 'Invalid credentials. Please try again.' };
    }
  },

  logout: async (): Promise<ServiceResponse<{}>> => {
    // In a real app, you might invalidate a token on the server.
    console.log('User logged out');
    localStorage.removeItem("currentUser");
    return Promise.resolve({ success: true, data: {} });
  },

  // Simulate fetching associated data for a user
  getSiteData: (siteId: string | null): Site | undefined => {
    if (!siteId) return undefined;
    return mockSites.find((s: Site) => s.id === siteId);
  },

  getSmallGroupData: (smallGroupId: string | null): SmallGroup | undefined => {
    if (!smallGroupId) return undefined;
    return mockSmallGroups.find((sg: SmallGroup) => sg.id === smallGroupId);
  },

  updateUserProfile: async (currentUser: User, updatedData: Partial<User>): Promise<ServiceResponse<User>> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    try {
      const newUser = { ...currentUser, ...updatedData };
      localStorage.setItem("currentUser", JSON.stringify(newUser));

      const userIndex = mockUsers.findIndex(u => u.id === currentUser.id);
      if (userIndex !== -1) {
        mockUsers[userIndex] = { ...mockUsers[userIndex], ...newUser };
      }
      
      console.log('User profile updated:', newUser);
      return { success: true, data: newUser };
    } catch (error) {
      console.error('Error updating user profile:', error);
      return { success: false, error: 'Failed to update user profile.' };
    }
  },

  getInitialUser: (): User | null => {
    try {
      const storedUser = localStorage.getItem("currentUser");
      if (storedUser) {
        const parsedUser: User = JSON.parse(storedUser);
        // Basic validation
        if (parsedUser && parsedUser.id && parsedUser.role) {
          return parsedUser;
        }
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      localStorage.removeItem("currentUser");
    }
    return null;
  }
};

export default authService;
