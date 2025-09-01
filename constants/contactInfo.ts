// Centralized contact information for consistency across the app
export const CONTACT_INFO = {
  // Business Information
  businessName: 'Test Salon',
  address: 'רחוב בדיקה 123, עיר בדיקה',
  phone: '+972523456789',
  phoneFormatted: '+972+972523456789',
  email: 'info@Test Salon.com',
  
  // Support/Admin Contact
  supportEmail: 'support@Test Salon.com',
  adminPhone: '+972+972523456789',
  
  // Display formats for UI
  displayAddress: 'רחוב בדיקה 123, עיר בדיקה',
  displayPhone: '+972523456789',
  contactText: 'לשאלות או בקשות: רחוב בדיקה 123, עיר בדיקה',
  
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