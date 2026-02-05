import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  if (typeof amount !== 'number' || isNaN(amount)) {
    amount = 0;
  }

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency
    }).format(amount);
  } catch (error) {
    console.error('Invalid currency code:', currency);
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }
};

export const formatDate = (dateString: string) => {
  if (!dateString || isNaN(new Date(dateString).getTime())) {
    return 'Invalid Date';
  }
  return new Date(dateString).toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

/**
 * Generates initials from a name string.
 * @param name The full name.
 * @returns A string of initials (e.g., "JD" for "John Doe").
 */
export function getInitials(name: string | null | undefined): string {
  if (!name || name.trim() === '') {
    return '?';
  }

  const names = name.trim().split(/\s+/);

  // If only one name, return the first two letters.
  if (names.length === 1 && names[0]) {
    return names[0].substring(0, 2).toUpperCase();
  }

  // If multiple names, return the first letter of the first and last name.
  const firstInitial = names[0] ? names[0][0] : '';
  const lastInitial = names.length > 1 && names[names.length - 1] ? names[names.length - 1][0] : '';

  return `${firstInitial}${lastInitial}`.toUpperCase();
}
