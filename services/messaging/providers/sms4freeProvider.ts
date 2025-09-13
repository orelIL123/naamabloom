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
      // Normalize recipient to digits-only (remove + and ensure it starts with 0)
      let recipient = (params.to || '').replace(/[^0-9]/g, '');
      if (recipient.startsWith('972')) {
        recipient = '0' + recipient.substring(3);
      }
      
      console.log(`📱 SMS4FREE: Sending SMS to ${recipient} via ${this.sender}`);
      console.log(`📱 SMS4FREE: Message: "${message}"`);

      // Try GET method first (more reliable for SMS4Free)
      const url = `${this.endpoint}?key=${encodeURIComponent(this.apiKey)}&user=${encodeURIComponent(this.user)}&pass=${encodeURIComponent(this.pass)}&sender=${encodeURIComponent(this.sender)}&recipient=${encodeURIComponent(recipient)}&msg=${encodeURIComponent(message)}`;
      
      console.log(`📱 SMS4FREE: Request URL: ${url}`);
      
      const response = await fetch(url, { 
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SMS4Free-Client/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        }
      });

      const responseText = await response.text();
      console.log(`📱 SMS4FREE: Response status: ${response.status}`);
      console.log(`📱 SMS4FREE: Response text: ${responseText}`);

      // Parse response - SMS4Free typically returns simple text responses
      if (response.ok) {
        // Look for success indicators
        const successIndicators = [
          /status\s*[:=]\s*1/i,
          /success/i,
          /sent/i,
          /ok/i,
          /^\d+$/  // Just a number (message ID)
        ];
        
        const isSuccess = successIndicators.some(pattern => pattern.test(responseText));
        
        if (isSuccess) {
          // Extract message ID if available
          const idMatch = responseText.match(/(\d+)/);
          const messageId = idMatch ? idMatch[1] : 'success';
          
          return { 
            success: true, 
            messageId, 
            provider: this.name 
          };
        }
      }

      // If GET fails, try POST method as fallback
      console.log('📱 SMS4FREE: GET failed, trying POST method...');
      
      const formData = new URLSearchParams();
      formData.append('key', this.apiKey);
      formData.append('user', this.user);
      formData.append('pass', this.pass);
      formData.append('sender', this.sender);
      formData.append('recipient', recipient);
      formData.append('msg', message);

      const postResponse = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'User-Agent': 'Mozilla/5.0 (compatible; SMS4Free-Client/1.0)',
        },
        body: formData.toString(),
      });

      const postText = await postResponse.text();
      console.log(`📱 SMS4FREE: POST Response status: ${postResponse.status}`);
      console.log(`📱 SMS4FREE: POST Response text: ${postText}`);

      if (postResponse.ok) {
        const successIndicators = [
          /status\s*[:=]\s*1/i,
          /success/i,
          /sent/i,
          /ok/i,
          /^\d+$/
        ];
        
        const isSuccess = successIndicators.some(pattern => pattern.test(postText));
        
        if (isSuccess) {
          const idMatch = postText.match(/(\d+)/);
          const messageId = idMatch ? idMatch[1] : 'success';
          
          return { 
            success: true, 
            messageId, 
            provider: this.name 
          };
        }
      }

      return { 
        success: false, 
        error: `SMS4Free API error: ${response.status} - ${responseText || postText || 'Unknown error'}`, 
        provider: this.name 
      };

    } catch (e: any) {
      console.error('📱 SMS4FREE Error:', e);
      return { success: false, error: `SMS4Free request failed: ${e.message}`, provider: this.name };
    }
  }
}
