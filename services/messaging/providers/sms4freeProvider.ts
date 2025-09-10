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
    this.apiKey = cfg.apiKey;
    this.user = cfg.user;
    this.pass = cfg.pass;
    this.sender = cfg.sender;
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
      // Ensure message is short (<70 characters in Hebrew) to avoid splitting
      const message = params.message.length > 70 ? params.message.substring(0, 67) + '...' : params.message;
      // Normalize recipient to digits-only (API often expects without '+')
      const recipient = (params.to || '').replace(/[^0-9]/g, '');
      
      const jsonBody = {
        key: this.apiKey,
        user: this.user,
        pass: this.pass,
        sender: this.sender,
        recipient,
        msg: message,
      } as const;

      console.log(`📱 SMS4FREE: Sending SMS to ${recipient} via ${this.sender}`);

      // Primary: application/x-www-form-urlencoded (more compatible with some gateways)
      const formResp = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams(jsonBody as any).toString(),
      });

      if (!formResp.ok) throw new Error(`HTTP ${formResp.status}`);
      let out: any;
      try {
        out = await formResp.json();
      } catch {
        const text = await formResp.text();
        // Try to parse common "status=1" style responses
        const m = text.match(/status\s*[:=]\s*(\d+)/i);
        out = { status: m ? Number(m[1]) : -1, message: text };
      }

      console.log('📱 SMS4FREE Response:', out);

      if (typeof out?.status === 'number' && out.status > 0) {
        return { success: true, messageId: String(out.status), provider: this.name };
      }
      // Fallback: try GET style in case server expects query params
      const url = `${this.endpoint}?key=${encodeURIComponent(this.apiKey)}&user=${encodeURIComponent(this.user)}&pass=${encodeURIComponent(this.pass)}&sender=${encodeURIComponent(this.sender)}&recipient=${encodeURIComponent(recipient)}&msg=${encodeURIComponent(message)}`;
      const getResp = await fetch(url, { method: 'GET' });
      const getText = await getResp.text();
      const ok = /status\s*[:=]\s*1|success/i.test(getText);
      if (ok) return { success: true, messageId: 'ok', provider: this.name };
      return { success: false, error: `${out?.status ?? 'N/A'} - ${out?.message || getText || 'unknown'}`, provider: this.name };
    } catch (e: any) {
      console.error('📱 SMS4FREE Error:', e);
      return { success: false, error: e.message, provider: this.name };
    }
  }
}
