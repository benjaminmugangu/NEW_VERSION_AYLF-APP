// src/services/userService.ts
'use client';

import { mockUsers } from '@/lib/mockData';
import type { ServiceResponse, User, UserFormData } from '@/lib/types';

const userService = {
  getAllUsers: async (): Promise<ServiceResponse<User[]>> => {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true, data: [...mockUsers] };
  },

  getUserById: async (userId: string): Promise<ServiceResponse<User>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const user = mockUsers.find((u) => u.id === userId);
    if (user) {
      return { success: true, data: user };
    }
    return { success: false, error: { message: 'User not found' } };
  },

  createUser: async (userData: UserFormData): Promise<ServiceResponse<User>> => {
    await new Promise(resolve => setTimeout(resolve, 500));

    if (mockUsers.some(u => u.email === userData.email)) {
      return { success: false, error: { message: 'A user with this email already exists.' } };
    }

    const { mandateStartDate, mandateEndDate, ...restOfUserData } = userData;

    const newUser: User = {
      id: `user-${Date.now()}`,
      ...restOfUserData,
      status: 'active',
      mandateStartDate: mandateStartDate?.toISOString(),
      mandateEndDate: mandateEndDate?.toISOString(),
    };

    mockUsers.push(newUser);
    return { success: true, data: newUser };
  },

  updateUser: async (userId: string, updatedData: Partial<UserFormData>): Promise<ServiceResponse<User>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const userIndex = mockUsers.findIndex(u => u.id === userId);

    if (userIndex === -1) {
      return { success: false, error: { message: 'User not found' } };
    }

    if (updatedData.email && mockUsers.some(u => u.email === updatedData.email && u.id !== userId)) {
      return { success: false, error: { message: 'This email is already in use by another account.' } };
    }

    const { mandateStartDate, mandateEndDate, ...restOfUpdatedData } = updatedData;

    const updatedFields: Partial<User> = { ...restOfUpdatedData };

    if (mandateStartDate) {
      updatedFields.mandateStartDate = mandateStartDate.toISOString();
    }
    if (mandateEndDate) {
      updatedFields.mandateEndDate = mandateEndDate.toISOString();
    }

    mockUsers[userIndex] = { ...mockUsers[userIndex], ...updatedFields };
    return { success: true, data: mockUsers[userIndex] };
  },

  deleteUser: async (userId: string): Promise<ServiceResponse<{ id: string }>> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const index = mockUsers.findIndex(u => u.id === userId);

    if (index === -1) {
      return { success: false, error: { message: 'User not found' } };
    }

    mockUsers.splice(index, 1);
    return { success: true, data: { id: userId } };
  },

  getUsersByIds: async (userIds: string[]): Promise<ServiceResponse<User[]>> => {
    await new Promise(resolve => setTimeout(resolve, 50));
    const users = mockUsers.filter(u => userIds.includes(u.id));
    return { success: true, data: users };
  },
};

export default userService;
