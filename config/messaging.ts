import { MessagingConfig } from '../services/messaging/types';

export const messagingConfig: MessagingConfig = {
  providers: {
    sms4free: {
      apiKey: process.env.SMS4FREE_API_KEY || '',
      user: process.env.SMS4FREE_USER || '',
      pass: process.env.SMS4FREE_PASS || '',
      sender: process.env.SMS4FREE_SENDER || '', // Will be loaded from Firebase Functions config
      enabled: true,
    },
    whatsapp: {
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
      enabled: !!process.env.WHATSAPP_ACCESS_TOKEN
    }
  },
  defaultProvider: 'sms4free',
  fallbackEnabled: false,
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