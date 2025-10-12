import { AVATAR_COLORS } from '../config/constants';

/**
 * Generate a consistent avatar color for a contact
 * Uses a simple hash function to ensure the same contact always gets the same color
 */
export function getAvatarColor(identifier: string): string {
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    const char = identifier.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Get absolute value and map to color index
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex];
}

/**
 * Generate initials from a name or phone number
 */
export function getInitials(name: string): string {
  const cleanName = name.trim();
  
  // For phone numbers, use first 2 characters
  if (cleanName.match(/^[\+\-\(\)\s\d]+$/)) {
    return cleanName.replace(/[^\d]/g, '').slice(-2);
  }
  
  // For names, use first letter of first two words
  const words = cleanName.split(/\s+/);
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}