import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates initials from a name string.
 * @param name The full name.
 * @returns A string of initials (e.g., "JD" for "John Doe").
 */
export function getInitials(name: string): string {
  if (!name) return "N/A";

  const names = name.trim().split(/\s+/);
  if (names.length === 1 && names[0]) {
    return names[0].substring(0, 2).toUpperCase();
  }

  const firstInitial = names[0] ? names[0][0] : '';
  const lastInitial = names.length > 1 && names[names.length - 1] ? names[names.length - 1][0] : '';

  return `${firstInitial}${lastInitial}`.toUpperCase();
}
