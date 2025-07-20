// src/hooks/use-current-user.ts
'use client';

import { useAuth } from './useAuth';

export const useCurrentUser = () => {
  const { currentUser } = useAuth();
  return currentUser;
};
