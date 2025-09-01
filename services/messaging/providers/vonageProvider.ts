import { MessageProvider, SendMessageParams, SendMessageResult } from '../types';

export class VonageProvider implements MessageProvider {
  name = 'vonage';
  private apiKey: string;
  private apiSecret: string;
  private enabled: boolean;

  constructor(config: { apiKey: string; apiSecret: string; enabled: boolean }) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.enabled = config.enabled;
  }

  isAvailable(): boolean {
    return this.enabled && !!this.apiKey && !!this.apiSecret;
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'Vonage provider not available',
        provider: this.name
      };
    }

    try {
      const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
      const response = await fetch(`https://us-central1-${projectId}.cloudfunctions.net/sendSMS`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: params.to,
          message: params.message,
          ...params.metadata
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: result.success,
        messageId: result.messageId,
        error: result.error,
        provider: this.name
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        provider: this.name
      };
    }
  }
}