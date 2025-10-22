/**
 * Phone number normalization utility
 * Normalizes Israeli phone numbers to a consistent format for Firebase
 */

// Normalize phone number to Firebase format (+972XXXXXXXXX)
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
  // Remove all whitespace, dashes, and parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Remove leading zeros from international format
  cleaned = cleaned.replace(/^00972/, '+972');
  
  // If starts with +972, ensure it's properly formatted
  if (cleaned.startsWith('+972')) {
    // Remove the +972 and re-add it to ensure consistency
    cleaned = cleaned.substring(4);
    // Remove leading zero if exists
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `+972${cleaned}`;
  }
  
  // If starts with 972 (without +), add the +
  if (cleaned.startsWith('972')) {
    cleaned = cleaned.substring(3);
    // Remove leading zero if exists
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return `+972${cleaned}`;
  }
  
  // If starts with 0 (Israeli format)
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1); // Remove the leading 0
    return `+972${cleaned}`;
  }
  
  // If it's just the number without any prefix (e.g., 523985505)
  if (/^[5][0-9]{8}$/.test(cleaned)) {
    return `+972${cleaned}`;
  }
  
  // Return cleaned number with +972 prefix
  return `+972${cleaned}`;
}

// Validate Israeli phone number (any format)
export function isValidIsraeliPhone(phone: string): boolean {
  if (!phone) return false;
  
  const normalized = normalizePhoneNumber(phone);
  
  // Check if normalized number matches Israeli mobile format
  // +972 followed by 5 (mobile) and 8 more digits
  const israeliMobileRegex = /^\+972[5][0-9]{8}$/;
  
  return israeliMobileRegex.test(normalized);
}

// Format phone for display (Israeli format: 0XX-XXX-XXXX)
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  
  // Remove +972 prefix for display
  if (normalized.startsWith('+972')) {
    const localNumber = normalized.substring(4);
    
    // Format as 0XX-XXX-XXXX
    if (localNumber.length === 9) {
      return `0${localNumber.substring(0, 2)}-${localNumber.substring(2, 5)}-${localNumber.substring(5)}`;
    }
    
    // Return with leading 0
    return `0${localNumber}`;
  }
  
  return phone;
}

// Get phone number variants for querying Firebase
// Returns array of possible formats that might be stored in Firebase
export function getPhoneVariants(phone: string): string[] {
  if (!phone) return [];
  
  // Clean the input first
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  const normalized = normalizePhoneNumber(phone);
  const variants: string[] = [];
  
  // Add the normalized version (+972XXXXXXXXX)
  variants.push(normalized);
  
  // Extract the local number (9 digits without country code)
  if (normalized.startsWith('+972')) {
    const localNumber = normalized.substring(4); // Remove '+972'
    
    // Add all possible variants:
    variants.push(`0${localNumber}`);           // 0523985505
    variants.push(localNumber);                  // 523985505
    variants.push(`972${localNumber}`);          // 972523985505
    variants.push(`00972${localNumber}`);        // 00972523985505
    
    // Add with dashes (some systems might store it)
    variants.push(`0${localNumber.substring(0, 2)}-${localNumber.substring(2)}`);
    variants.push(`+972-${localNumber}`);
    
    // Add with spaces
    variants.push(`0${localNumber.substring(0, 2)} ${localNumber.substring(2)}`);
  }
  
  // Also add the original cleaned input
  variants.push(cleaned);
  
  // Remove duplicates and empty strings
  return [...new Set(variants)].filter(v => v && v.length > 0);
}

// Example usage:
// normalizePhoneNumber('0523985505') => '+972523985505'
// normalizePhoneNumber('523985505') => '+972523985505'
// normalizePhoneNumber('+972523985505') => '+972523985505'
// normalizePhoneNumber('972523985505') => '+972523985505'
// normalizePhoneNumber('052-398-5505') => '+972523985505'
// normalizePhoneNumber('+972-52-398-5505') => '+972523985505'

