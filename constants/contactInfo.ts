// Centralized contact information for consistency across the app
export const CONTACT_INFO = {
  // Business Information
  businessName: 'Test Salon',
  address: 'חופים 1 נווה אילן',
  phone: '0536202292',
  phoneFormatted: '+972536202292',
  email: 'Naamabloom222@gmail.com',
  
  // Support/Admin Contact
  supportEmail: 'Naamabloom222@gmail.com',
  adminPhone: '+972536202292',
  
  // Display formats for UI
  displayAddress: 'חופים 1 נווה אילן',
  displayPhone: '0536202292',
  contactText: 'לשאלות או בקשות: חופים 1 נווה אילן',
  
  // Business hours
  businessHours: {
    sunday: '9:00-18:00',
    monday: '9:00-18:00', 
    tuesday: '9:00-18:00',
    wednesday: '9:00-18:00',
    thursday: '9:00-18:00',
    friday: '9:00-15:00',
    saturday: 'סגור'
  }
} as const;

// Helper functions
export const formatPhoneForAuth = (phone: string): string => {
  // Remove any non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Add +972 prefix if not present
  if (cleaned.startsWith('0')) {
    return '+972' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('+972') && !cleaned.startsWith('972')) {
    return '+972' + cleaned;
  }
  if (cleaned.startsWith('972')) {
    return '+' + cleaned;
  }
  return cleaned;
};

export const isAdminPhone = (phone: string): boolean => {
  const formatted = formatPhoneForAuth(phone);
  return formatted === CONTACT_INFO.adminPhone;
};