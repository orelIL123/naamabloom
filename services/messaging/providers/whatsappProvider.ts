import { MessageProvider, SendMessageParams, SendMessageResult } from '../types';

export class WhatsAppProvider implements MessageProvider {
  name = 'whatsapp';
  private phoneNumberId: string;
  private accessToken: string;
  private enabled: boolean;

  constructor(config: { phoneNumberId: string; accessToken: string; enabled: boolean }) {
    this.phoneNumberId = config.phoneNumberId;
    this.accessToken = config.accessToken;
    this.enabled = config.enabled;
  }

  isAvailable(): boolean {
    return this.enabled && !!this.phoneNumberId && !!this.accessToken;
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (!this.isAvailable()) {
      return {
        success: false,
        error: 'WhatsApp provider not available',
        provider: this.name
      };
    }

    try {
      const response = await fetch(`https://graph.facebook.com/v17.0/${this.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: params.to,
          type: 'text',
          text: {
            body: params.message
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`WhatsApp API error: ${errorData.error?.message || response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        messageId: result.messages?.[0]?.id,
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