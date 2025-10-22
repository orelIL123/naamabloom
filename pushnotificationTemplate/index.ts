// 🚀 Push Notification System Template - Main Export File

// Core notification services
export * from './services/notificationService';

// SMS messaging services
export * from './services/messaging';

// Configuration
export { enableWhatsApp, messagingConfig, updateMessagingProvider } from './config/messaging';

// Example usage
export * from './examples/adminExample';
export * from './examples/appSetupExample';
export * from './examples/bookingExample';

// Types
export interface PushNotificationData {
  appointmentId?: string;
  type?: 'appointment' | 'maintenance' | 'system_update' | 'promotion' | 'general';
  [key: string]: any;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  phone: string;
  pushToken?: string;
  isAdmin?: boolean;
}

export interface MessagingConfig {
  providers: {
    sms4free?: {
      apiKey: string;
      user: string;
      pass: string;
      sender: string;
      enabled: boolean;
    };
    whatsapp?: {
      phoneNumberId: string;
      accessToken: string;
      enabled: boolean;
    };
  };
  defaultProvider: 'sms4free' | 'whatsapp';
  fallbackEnabled: boolean;
}

// Quick setup function
export const setupNotificationSystem = () => {
  console.log('🚀 Push Notification System Template loaded!');
  console.log('📖 Read README.md for setup instructions');
  console.log('🛠 Check SETUP.md for quick installation');
  console.log('🔧 See REQUIRED_FUNCTIONS.md for implementation details');
};

// Version info
export const VERSION = '1.0.0';
export const AUTHOR = 'Ron Turgeman';
