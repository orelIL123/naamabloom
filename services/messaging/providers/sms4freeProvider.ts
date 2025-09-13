import { MessageProvider, SendMessageParams, SendMessageResult } from '../types';

export class SMS4FreeProvider implements MessageProvider {
  name = 'sms4free';
  private apiKey: string;
  private user: string;
  private pass: string;
  private sender: string;
  private enabled: boolean;
  private endpoint = 'https://api.sms4free.co.il/ApiSMS/v2/SendSMS';

  constructor(cfg: { apiKey: string; user: string; pass: string; sender: string; enabled: boolean }) {
    // Use exact ToriX credentials or fallback to config
    this.apiKey = cfg.apiKey || 'mgfwkoRBI';
    this.user = cfg.user || '0523985505';  // Connection number
    this.pass = cfg.pass || '73960779';
    this.sender = cfg.sender || 'ToriX';  // Brand name
    this.enabled = cfg.enabled;
  }

  isAvailable(): boolean {
    return this.enabled && !!this.apiKey && !!this.user && !!this.pass && !!this.sender;
  }

  async send(params: SendMessageParams): Promise<SendMessageResult> {
    if (!this.isAvailable()) {
      return { success: false, error: 'SMS4FREE not available', provider: this.name };
    }

    try {
      // Convert international format (+972xxxxxxxxx) back to Israeli local format (05xxxxxxxx)
      // SMS4Free API expects Israeli local format
      let recipient = params.to;
      if (recipient.startsWith('+972')) {
        recipient = '0' + recipient.substring(4);
      }
      
      // Ensure message is short (<70 characters in Hebrew) to avoid splitting
      const message = params.message.length > 70 ? params.message.substring(0, 67) + '...' : params.message;
      
      const body = {
        key: this.apiKey,
        user: this.user,
        pass: this.pass,
        sender: this.sender,
        recipient: recipient,
        msg: message,
      };

      console.log(`📱 ToriX SMS: Sending SMS to ${params.to} via ${this.sender}`);

      const resp = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const out = await resp.json(); // {status:number, message:string}

      console.log('📱 ToriX SMS Response:', out);

      if (typeof out?.status === 'number' && out.status > 0) {
        return { success: true, messageId: String(out.status), provider: this.name };
      }
      return { success: false, error: `${out?.status} - ${out?.message || 'unknown'}`, provider: this.name };
    } catch (e: any) {
      console.error('📱 ToriX SMS Error:', e);
      return { success: false, error: e.message, provider: this.name };
    }
  }
}