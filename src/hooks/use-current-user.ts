// src/hooks/use-current-user.ts
'use client';

import { useAuth } from '@/contexts/AuthContext';

export const useCurrentUser = () => {
  const { currentUser } = useAuth();
  return currentUser;
};
