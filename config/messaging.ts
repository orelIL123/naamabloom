import { MessagingConfig } from '../services/messaging/types';

export const messagingConfig: MessagingConfig = {
  providers: {
    sms4free: {
      apiKey: process.env.SMS4FREE_API_KEY || 'demo_api_key',
      user: process.env.SMS4FREE_USER || 'demo_user',
      pass: process.env.SMS4FREE_PASS || 'demo_pass',
      sender: process.env.SMS4FREE_SENDER || 'DemoApp',
      enabled: true,
    },
    vonage: {
      apiKey: process.env.VONAGE_API_KEY || 'demo_vonage_key',
      apiSecret: process.env.VONAGE_API_SECRET || 'demo_vonage_secret',
      enabled: true
    },
    whatsapp: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      enabled: !!process.env.WHATSAPP_ACCESS_TOKEN
    }
  },
  defaultProvider: 'vonage',
  fallbackEnabled: true,
};

export const updateMessagingProvider = (provider: 'sms4free' | 'whatsapp') => {
  messagingConfig.defaultProvider = provider;
};

export const enableWhatsApp = (phoneNumberId: string, accessToken: string) => {
  if (messagingConfig.providers.whatsapp) {
    messagingConfig.providers.whatsapp.phoneNumberId = phoneNumberId;
    messagingConfig.providers.whatsapp.accessToken = accessToken;
    messagingConfig.providers.whatsapp.enabled = true;
  }
};