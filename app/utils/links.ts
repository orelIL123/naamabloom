/**
 * Unified link generation utilities for external services
 * All links use HTTPS for better compatibility and security
 */

/**
 * Generate Waze navigation link
 * @param lat Latitude coordinate
 * @param lon Longitude coordinate  
 * @param navigate Whether to start navigation immediately
 * @returns HTTPS Waze URL
 */
export function waze(lat: number, lon: number, navigate: boolean = true): string {
  const navigateParam = navigate ? 'yes' : 'no';
  return `https://waze.com/ul?ll=${lat}%2C${lon}&navigate=${navigateParam}`;
}

/**
 * Generate WhatsApp chat link
 * @param phoneE164 Phone number in E.164 format (e.g., +972523456789)
 * @returns HTTPS WhatsApp URL
 */
export function whatsapp(phoneE164: string): string {
  // Remove + and any non-digits for WhatsApp URL
  const digits = phoneE164.replace(/[^\d]/g, '');
  return `https://wa.me/${digits}`;
}

/**
 * Generate phone call link
 * @param phoneE164 Phone number in E.164 format
 * @returns tel: URL for phone calls
 */
export function phone(phoneE164: string): string {
  return `tel:${phoneE164}`;
}

/**
 * Generate SMS link
 * @param phoneE164 Phone number in E.164 format
 * @param message Optional pre-filled message
 * @returns sms: URL for SMS
 */
export function sms(phoneE164: string, message?: string): string {
  const base = `sms:${phoneE164}`;
  return message ? `${base}?body=${encodeURIComponent(message)}` : base;
}

/**
 * Generate email link
 * @param email Email address
 * @param subject Optional subject line
 * @param body Optional email body
 * @returns mailto: URL
 */
export function email(email: string, subject?: string, body?: string): string {
  let url = `mailto:${email}`;
  const params = [];
  
  if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  
  return url;
}